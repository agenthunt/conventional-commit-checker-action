const core = require('@actions/core');
const github = require('@actions/github');

function regexFromString (string) {
  const escapedRegexString = string
		.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
		.replace(/-/g, '\\x2d');
  return new RegExp(escapedRegexString)
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
  prTitleRegexPattern.match()

  const prBodyRegexPattern = core.getInput("pr-body-regex");
  const prBodyRegExp = regexFromString(prBodyRegexPattern)
  if(!prBodyRegExp.test(body)){
    core.setFailed(`Pull request body does not match ${prBodyRegexPattern}`);
    return;
  }

} catch (error) {
  core.setFailed(error.message);
}