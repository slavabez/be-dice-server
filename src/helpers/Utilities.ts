/**
 * Returns the original string, unless it's longer than length specified, in which case shortens it to that length
 * @param subject - String to check
 * @param length - length to enforce
 */
export function ensureLength(subject: string, length: number = 255) {
  if (subject.length <= length) {
    return subject;
  } else {
    return subject.substr(0, length);
  }
}
