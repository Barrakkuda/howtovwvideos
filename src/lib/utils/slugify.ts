import originalSlugify from "slugify";

export function slugify(text: string): string {
  return originalSlugify(text, {
    lower: true,
    strict: true,
    replacement: "-",
    remove: /[*+~.()'"!:@]/g,
    trim: true,
  });
}
