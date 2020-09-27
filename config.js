const CONFIG = {
  GITLAB: {}
}
if (process.env.STAGE === 'production') {
  CONFIG.GITLAB = {
    APP_ID: '9137cd048184841c11945195eb351626b966cd5e54904289b75f725a4af1bbc3',
    APP_SECRET: '3cb57621b38efba3add83dda49042811c41801dc446b688e5cf808c47396e0d0',
    HOST: 'https://gitlab.now.sh'
  }
} else {
  CONFIG.GITLAB = {
    APP_ID: '03853c6f1c27c74c0d1de3204f29457eec0a83f4aaa2283c3d5c12fab0147ef4',
    APP_SECRET: '013d4cebfff119bfbd71bbb29ce163db15c315eea6d6e92cf268d6d7ceb0813e',
    HOST: 'http://localhost:3000'
  }
}
export default CONFIG
