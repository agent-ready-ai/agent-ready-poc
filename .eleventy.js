export default function (eleventyConfig) {
  eleventyConfig.setServerOptions({
    port: 8080,
    showAllHosts: true,
  });

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

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
