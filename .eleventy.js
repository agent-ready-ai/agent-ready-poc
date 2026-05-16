export default function (eleventyConfig) {
  eleventyConfig.setServerOptions({
    port: 8080,
    showAllHosts: true,
  });

  // String prefix test for nav aria-current handling.
  eleventyConfig.addNunjucksFilter("startswith", (str, prefix) =>
    typeof str === "string" && str.startsWith(prefix),
  );

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Files that Cloudflare Pages expects at the deploy root.
  // (_headers and robots.txt drive Gate 1 Discoverability + Bot Access Control.)
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({ "src/llms.txt": "llms.txt" });
  eleventyConfig.addPassthroughCopy({ "src/llms-full.txt": "llms-full.txt" });

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
