import proxy from "http-proxy-middleware";

function searchProxy(cfg) {
  const target = cfg.searchService;
  const options = {
    target,
    changeOrigin: true,
    pathRewrite: path =>
      path.replace("/api/v3/search/simple", "/search/simple/staff")
  };
  return proxy(options);
}

export { searchProxy as default };
