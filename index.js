import express from 'express'
import conf from './config'
import axios from 'axios'
const app = express()
const server = require('http').createServer(app)
import io from './libs/io'
import { URL } from 'url'

const PORT = 3000

const staticPath = require('path').join(process.cwd(), '/static')
app.use(express.static(staticPath))

app.use(require('body-parser').json())
app.use(require('cookie-parser')('GITLAB'))

app.set('view engine', 'ejs')
app.set('views', __dirname + '/templates')

app.use('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  // TODO: hsdsadasd
  res.header(
    'Access-Control-Allow-Headers',
    'Authorization,Origin, X-Requested-With, Content-Type, Accept,X-Access-Token'
  )
  res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS')
  res.header('Access-Control-Max-Age', 86400)
  res.header('X-Powered-By', 'Express 4.1')
  next()
})

// gitlab oauth callback router
app.get('/oauth', async (req, res) => {
  const { code, state: referer } = req.query
  if (code) {
    let tokenData
    try {
      tokenData = await getToken(code)
    } catch (err) {
      if (err.response.status === 401) {
        return res.end(`${err.response.status}:${err.response.data.message}`)
      }
    }
    const token = tokenData.access_token
    const cookieConfig = { maxAge: 86400000 * 10, httpOnly: true }
    res.cookie('token', token, cookieConfig)
    res.cookie('lt', Date.now(), cookieConfig)

    if (referer === 'in_app') {
      return res.redirect('/login?in_app=1')
    }

    if (referer) {
      const u = new URL(referer)
      if (u.searchParams.get('token')) {
        u.searchParams.delete('token')
      }
      u.searchParams.set('token', token)
      res.redirect(u.href)
    } else {
      res.redirect('/')
    }
  } else {
    res.end('error')
  }
})
// error page
app.get('/error', (req, res) => {
  if (!req.query.status || !req.query.message) {
    return res.end('出错啦')
  }
  res.end(`
    <p>Error Code: ${req.query.status}</p>
    <p>Message: ${req.query.message}</p>
  `)
})
// home router
app.get('/', async (req, res) => {
  const { token, lt } = req.cookies
  if (!token || !lt) {
    return res.redirect('/login')
  } else {
    let user
    try {
      user = await getUserInfo(token)
    } catch (getUserError) {
      return res.redirect('/logout')
    }
    res.render('index', {
      token,
      user
    })
  }
})
// login router
app.get('/login', async (req, res) => {
  try {
    const { token, lt } = req.cookies
    const referer = req.query.redirect_to || (req.query.in_app ? 'in_app' : '')
    if (!token || !lt) {
      const loginUrl = `https://cichang8.com/oauth/authorize?client_id=${conf.GITLAB
        .APP_ID}&scope=read_user%20profile&redirect_uri=${encodeURIComponent(
        conf.GITLAB.HOST + '/oauth'
      )}&response_type=code&state=${encodeURIComponent(referer)}`
      res.render('login', {
        title: '登录',
        loginUrl
      })
    } else {
      // 校验token有效性
      try {
        await getUserInfo(token)
      } catch (getUserError) {
        return res.redirect('/logout')
      }
      // in app 登录
      if (req.query.in_app) {
        return res.render('applogin', { token })
      }
      // redirect 跳转
      let redirectUrl = referer
      if (referer && referer.indexOf(conf.GITLAB.HOST) < 0 && referer.indexOf('cichang8.com') < 0) {
        const u = new URL(referer)
        if (u.searchParams.get('token')) {
          u.searchParams.delete('token')
        }
        u.searchParams.set('token', token)
        redirectUrl = u.href
        return res.redirect(redirectUrl)
      }
      // 自身
      res.redirect('/')
    }
  } catch (err) {
    throw err
  }
})
// logout router
app.get('/logout', (req, res) => {
  res.cookie('token', '', { maxAge: 0, httpOnly: true })
  res.cookie('lt', '', { maxAge: 0, httpOnly: true })
  res.redirect('/login')
})
// logout api
app.delete('/logout', (req, res) => {
  res.cookie('token', '', { maxAge: 0, httpOnly: true })
  res.cookie('lt', '', { maxAge: 0, httpOnly: true })
  res.sendStatus(200)
})
app.get('*', (req, res) => res.sendStatus(404))

function getToken(code) {
  const data = {
    client_id: conf.GITLAB.APP_ID,
    client_secret: conf.GITLAB.APP_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: conf.GITLAB.HOST + '/oauth'
  }
  return axios
    .post('https://cichang8.com/oauth/token', data)
    .then(resp => resp.data)
    .catch(ret => ret.response.data)
}

function getUserInfo(token) {
  return axios
    .get(`https://cichang8.com/api/v4/user?access_token=${token}`)
    .then(resp => resp.data)
    .catch(ret => ret.response.data)
}

function clear() {
  process.stdout.write('\u001B[2J\u001B[0;0f')
}

server.listen(PORT, () => {
  clear()
  io.start(server)
  console.log('http start at port: ' + PORT)
})
