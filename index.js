const core = require('@actions/core');
const github = require('@actions/github');

try {
  const title = JSON.stringify(github.context.payload.pull_request.title, undefined, 2)
  const body  = JSON.stringify(github.context.payload.pull_request.body, undefined, 2)
  console.log(`pr title: ${title}`);
  console.log(`pt body: ${body}`);

} catch (error) {
  core.setFailed(error.message);
}