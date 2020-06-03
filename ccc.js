export function validatePR({
  title,
  body,
  prTitleRegexPattern,
  prBodyRegexPattern,
}) {
  const prTitleRegExp = new RegExp(prTitleRegexPattern);
  const prTitleMatchResult = prTitleRegExp.test(title);
  if (!prTitleMatchResult) {
    return `Pull request title ${title} does not match ${prTitleRegexPattern}`;
  }

  const prBodyRegExp = new RegExp(prBodyRegexPattern);
  if (!prBodyRegExp.test(body)) {
    return `Pull request body does not match ${prBodyRegexPattern}`;
  }
  return null;
}
