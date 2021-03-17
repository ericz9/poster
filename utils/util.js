import api from 'api.js'
const app = getApp()

const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

const uuid = () => {
  let s = []
  var hexDigits = '0123456789abcdef'
  for (var i = 0; i < 36; i++) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
  }
  s[14] = '4'
  s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1)
  s[8] = s[13] = s[18] = s[23] = '-'

  return s.join('')
}

const env = () => {
  return app.globalData.debug ? app.globalData.env.devp : app.globalData.env.prod
}

//填充图片地址
const imageResizer = (value, width, height, mode) => {
  if (!width) width = '300'
  if (!height) height = '300'
  if (!mode) mode = 'p'

  return (env().fileServerUrl + value).replace('{0}', width).replace('{1}', height).replace('{2}', mode)
}

//原始图片
const imageClear = (value) => {
  return (env().fileServerUrl + value).replace('{0}x{1}{2}', '')
}

//微信授权登录
const login = (ignoreRedirect) => {
  return new Promise((resolve, reject) => {
    //whoami已失效
    if (!app.globalData.whoami) {
      const launchOptions = wx.getLaunchOptionsSync()
      app.onLaunch(launchOptions)
      reject()
    } else {
      //是否已登录
      if (app.globalData.whoami.login === 1) {
        resolve()
      } else {
        wx.showLoading({
          title: '拼命加载中',
          mask: true
        })

        api.wxLogin()
        .then((d) => {
          app.globalData.whoami.login = 1
          app.globalData.whoami.user = d
          wx.hideLoading()
          resolve()
        })
        .catch((err) => {
          app.globalData.whoami.login = 0
          app.globalData.whoami.user = {}
          wx.hideLoading()
          err.redirect && !ignoreRedirect && wx.navigateTo({url: '/pages/_shared/auth/index'})
          reject(err)
        })
      }
    }
  })
}

//微信文本内容安全检测
const checkMessage = (value) => {
  return new Promise((resolve, reject) => {
    api.checkMessage({
      value: value
    })
    .then((d) => {
      if (d.wxErrorCode === 0 && d.wxErrorMsg === 'ok') {
        resolve()
      } else {
        wx.showToast({
          title: '您输入的内容包含敏感信息，请重新输入。',
          icon: 'none'
        })
        
        reject()
      }
    })
    .catch(() => {
      reject()
    })
  })
}

module.exports = {
  formatTime: formatTime,
  uuid: uuid,
  env: env,
  imageResizer: imageResizer,
  imageClear: imageClear,
  login: login,
  checkMessage: checkMessage,
}
