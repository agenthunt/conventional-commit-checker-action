export function validatePR({
  title,
  body,
  prTitleRegexPattern,
  prBodyRegexPattern,
}) {
  const prTitleRegExp = new RegExp(prTitleRegexPattern);
  const prTitleMatchResult = prTitleRegExp.test(title);
  if (!prTitleMatchResult) {
    return {
      status: "failure",
      message: `Pull request title 
      **************************************************************************************
      ${title}
      ************************************************************************************** 
      does not match ${prTitleRegexPattern}`,
    };
  }

  const prBodyRegExp = new RegExp(prBodyRegexPattern);
  if (!prBodyRegExp.test(body)) {
    return {
      status: "failure",
      message: `Pull request body 
      **************************************************************************************
      ${body}
      **************************************************************************************
      does not match ${prBodyRegexPattern}`,
    };
  }
  return {
    status: "success",
    message: `
      Pull request title 
      **************************************************************************************
      ${title}
      **************************************************************************************
      matches ${prTitleRegexPattern}
      Pull request body
      **************************************************************************************
      ${body}
      **************************************************************************************
      matches ${prBodyRegexPattern}
      `,
  };
}
