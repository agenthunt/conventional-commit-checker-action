const core = require('@actions/core');
const github = require('@actions/github');

try {
  const title = JSON.stringify(github.context.payload.pull_request.title, undefined, 2)
  const body  = JSON.stringify(github.context.payload.pull_request.body, undefined, 2)
  console.log(`pr title: ${title}`);
  console.log(`pr body: ${body}`);
  const prTitleRegexPattern = core.getInput("pr-title-regex");
  
  const prTitleRegExp = new RegExp(prTitleRegexPattern);
  if(!prTitleRegExp.test(title)){
    core.setFailed(`Pull request title does not match ${prTitleRegexPattern}`);
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