import proxy from "http-proxy-middleware";

function orgchartProxy(cfg) {
  const target = cfg.orgchartService;
  const options = {
    target,
    changeOrigin: true,
    pathRewrite: path => path.replace("/api/v3/orgchart", "/orgchart")
  };
  return proxy(options);
}

export { orgchartProxy as default };
