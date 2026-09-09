import { configurationFor } from "./commerce-configurations";

// A demo configuration has its own complete URL space and cart lifetime.
// Ordinary tenant slugs retain the existing public route.
export function storefrontPath(slug: string): string {
  const match = /^demo--([a-z]+)--([a-z]+)$/.exec(slug);
  const configuration = match && configurationFor(match[1], match[2]);
  return configuration ? configuration.href : `/s/${slug}`;
}

export function configurationSlug(vertical: string, approach: string): string {
  return `demo--${vertical}--${approach}`;
}
