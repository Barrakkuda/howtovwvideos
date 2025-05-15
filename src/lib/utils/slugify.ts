import originalSlugify from "slugify";

export function slugify(text: string): string {
  return originalSlugify(text, {
    lower: true, // convert to lower case, defaults to `false`
    strict: true, // strip special characters except replacement, defaults to `false`
    replacement: "-", // replace spaces with replacement character, defaults to `-`
    remove: /[*+~.()'"!:@]/g, // remove characters that match regex, defaults to `undefined`
    trim: true, // trim leading and trailing replacement chars, defaults to `true`
  });
}
