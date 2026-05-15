/**
 * Returns the text to show if slotted tag is not in range of valid tags
 * @param {string} tag - received tag.
 * @param {readonly string[]} valid - expected tags.
 * @return {string} - text to render
 */
export const invalidSlottedTag = (tag: string, valid: readonly string[]) => {
  return `${tag} is invalid. This component only accepts ${valid.join(', ')}`;
};
