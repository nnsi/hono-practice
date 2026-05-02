// Generate a per-run unique tag so flows can be re-run without colliding with
// data from previous runs. Used by task.yaml etc. via `${output.RUN_TAG}`.
output.RUN_TAG = "r" + Date.now();
