export default function (eleventyConfig) {
  eleventyConfig.setServerOptions({
    port: 8080,
    showAllHosts: true,
  });

  // String prefix test for nav aria-current handling.
  eleventyConfig.addNunjucksFilter("startswith", (str, prefix) =>
    typeof str === "string" && str.startsWith(prefix),
  );

  // BreadcrumbList JSON-LD generator. Returns an array of
  //   { position, name, item } from a page URL like "/services/dispatch-automation/",
  // rooted at the site URL. Returns [] for the home page.
  eleventyConfig.addNunjucksFilter("breadcrumbs", (url, siteUrl) => {
    if (!url || url === "/") return [];
    const parts = url.split("/").filter(Boolean);
    const crumbs = [{ position: 1, name: "Home", item: siteUrl + "/" }];
    let path = "";
    for (const part of parts) {
      path += "/" + part;
      const name = part
        .split("-")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
      crumbs.push({
        position: crumbs.length + 1,
        name,
        item: siteUrl + path + "/",
      });
    }
    return crumbs;
  });

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Files that Cloudflare Pages expects at the deploy root.
  // (_headers and robots.txt drive Gate 1 Discoverability + Bot Access Control.)
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({ "src/llms.txt": "llms.txt" });
  eleventyConfig.addPassthroughCopy({ "src/llms-full.txt": "llms-full.txt" });
  eleventyConfig.addPassthroughCopy({ "src/openapi.json": "openapi.json" });
  eleventyConfig.addPassthroughCopy({ "src/well-known": ".well-known" });

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
