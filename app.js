const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const { format } = require("date-fns");

const dbPath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndPriorityProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};
app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  if (
    category !== "WORK" &&
    category !== "HOME" &&
    category !== "LEARNING" &&
    category !== undefined
  ) {
    response.status(401);
    response.send("Invalid Todo Category");
  } else if (
    priority !== "HIGH" &&
    priority !== "MEDIUM" &&
    priority !== "LOW" &&
    priority !== undefined
  ) {
    response.status(401);
    response.send("Invalid Todo Priority");
  } else if (
    status !== "TO DO" &&
    status !== "IN PROGRESS" &&
    status !== "DONE" &&
    status !== undefined
  ) {
    response.status(401);
    response.send("Invalid Todo Status");
  } else {
    switch (true) {
      case hasPriorityAndStatusProperties(request.query):
        getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
        break;
      case hasCategoryAndStatusProperties(request.query):
        getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND category = '${category}';`;
        break;
      case hasCategoryAndPriorityProperties(request.query):
        getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}'
        AND category = '${category}';`;
        break;
      case hasPriorityProperty(request.query):
        getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
        break;
      case hasCategoryProperty(request.query):
        getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}';`;
        break;
      case hasStatusProperty(request.query):
        getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
        break;
      default:
        getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
    }

    data = await db.all(getTodosQuery);
    response.send(data);
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id = ${todoId};`;
  const todo = await db.get(getTodoQuery);
  response.send(todo);
});

app.get("/agenda/", async (request, response) => {
  let data = null;
  let ate = null;
  let getTodosQuery = "";
  const { search_q = "", date } = request.query;
  ate = new Date(`${date.split("-")}`);
  console.log(format(ate, "yyyy-MM-dd"));
  getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND due_date = '${format(ate, "yyyy-MM-dd")}';`;
  data = await db.all(getTodosQuery);
  if (data === undefined || data === null) {
    response.status(401);
    response.send("Invalid Due Date");
  } else {
    console.log(data);
    response.send(data);
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, category, priority, status, dueDate } = request.body;
  let isDate = function (input) {
    let fil = `${Date.parse(input)}`;

    if (fil === "NaN") {
      return false;
    } else {
      return true;
    }
  };

  if (category !== "WORK" && category !== "HOME" && category !== "LEARNING") {
    response.status(401);
    response.send("Invalid Todo Category");
  } else if (
    priority !== "HIGH" &&
    priority !== "MEDIUM" &&
    priority !== "LOW"
  ) {
    response.status(401);
    response.send("Invalid Todo Priority");
  } else if (
    status !== "TO DO" &&
    status !== "IN PROGRESS" &&
    status !== "DONE"
  ) {
    response.status(401);
    response.send("Invalid Todo Status");
  } else if (isDate(dueDate) === false) {
    response.status(401);
    response.send("Invalid Due Date");
  } else {
    const postTodoQuery = `
  INSERT INTO
    todo (id, todo, category, priority, status, due_date)
  VALUES
    (${id}, '${todo}', '${category}', '${priority}', '${status}', '${dueDate}');`;
    await db.run(postTodoQuery);
    response.send("Todo Successfully Added");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
  }
  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body;

  let isDate = function (input) {
    let fil = `${Date.parse(input)}`;
    if (fil === "NaN") return true;
    return false;
  };
  console.log(status);
  console.log(dueDate);
  if (category !== "WORK" && category !== "HOME" && category !== "LEARNING") {
    response.status(401);
    response.send("Invalid Todo Category");
  } else if (
    priority !== "HIGH" &&
    priority !== "MEDIUM" &&
    priority !== "LOW"
  ) {
    response.status(401);
    response.send("Invalid Todo Priority");
  } else if (
    status !== "TO DO" &&
    status !== "IN PROGRESS" &&
    status !== "DONE"
  ) {
    response.status(401);
    response.send("Invalid Todo Status");
  } else if (isDate(dueDate)) {
    response.status(401);
    response.send("Invalid Due Date");
  } else {
    const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category='${category}',
      due_date='${dueDate}'
    WHERE
      id = ${todoId};`;

    await db.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
