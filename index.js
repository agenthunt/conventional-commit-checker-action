const core = require('@actions/core');
const github = require('@actions/github');

function regexFromString (string) {
  var match = /^\/(.*)\/([a-z]*)$/.exec(string)
  return new RegExp(match[1], match[2])
}

try {
  const title = github.context.payload.pull_request.title;
  const body  = github.context.payload.pull_request.body;

  const prTitleRegexPattern = core.getInput("pr-title-regex");
  
  const prTitleRegExp = regexFromString(prTitleRegexPattern)
  if(!prTitleRegExp.test(title)){
    core.setFailed(`Pull request title ${title} does not match ${prTitleRegexPattern}`);
    return;
  }

  const prBodyRegexPattern = core.getInput("pr-body-regex");
  const prBodyRegExp = regexFromString(prBodyRegexPattern)
  if(!prBodyRegExp.test(body)){
    core.setFailed(`Pull request body does not match ${prBodyRegexPattern}`);
    return;
  }

} catch (error) {
  core.setFailed(error.message);
}