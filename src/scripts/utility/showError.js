export function showError(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}