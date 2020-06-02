const core = require('@actions/core');
const github = require('@actions/github');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

try {
  const title = github.context.payload.pull_request.title;
  const body  = github.context.payload.pull_request.body;

  const prTitleRegexPattern = core.getInput("pr-title-regex");
  
  const prTitleRegExp = new RegExp(escapeRegExp(prTitleRegexPattern));
  if(!prTitleRegExp.test(title)){
    core.setFailed(`Pull request title ${title} does not match ${prTitleRegexPattern}`);
    return;
  }

  const prBodyRegexPattern = core.getInput("pr-body-regex");
  const prBodyRegExp = new RegExp(prBodyRegexPattern);
  if(!prBodyRegExp.test(body)){
    core.setFailed(`Pull request body does not match ${prBodyRegexPattern}`);
    return;
  }

} catch (error) {
  core.setFailed(error.message);
}