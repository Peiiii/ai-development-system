// The current prototype only keeps data for one process. Complete the store.
let tasks = [];

export async function add(title) {
  const task = { id: tasks.length + 1, title, done: false };
  tasks.push(task);
  return task;
}

export async function list() {
  return tasks;
}

export async function done(id) {
  const task = tasks.find((item) => item.id === Number(id));
  if (task) task.done = true;
  return task;
}
