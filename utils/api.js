module.exports = {
  // HTTP请求构造
  http: {
    //会话token
    token: '',
    //API接口前缀
    baseURL: '',
    //分页设置
    pager: {
      limit: 10 //分页大小
    },
    //API请求，只支持POST
    post(options) {
      return new Promise((resolve, reject) => {
        //ext中包含loading等配置项
        const ext = options.ext || {}
        if (ext.loading) {
          wx.showLoading({
            title: '拼命加载中',
            mask: true
          })
        }

        wx.request({
          url: this.baseURL + options.url,
          method: 'POST',
          data: options.params || {},
          header: {
            'token': this.token,
            'content-type': 'application/json'
          },
          success(res) {
            switch (res.data.errcode) {
              case 0:
                ext.loading && wx.hideLoading()

                //分页api，数据原样返回
                options.params.page ? resolve(res.data) : resolve(res.data.data)
                break
              //登录状态已过期
              case 407:
                ext.loading && wx.hideLoading()
                reject(res.data)
                break
              default:
                ext.loading && wx.hideLoading()
                
                if (ext.showToast) {
                  wx.showToast({
                    title: res.data.errmsg || '当前网络不稳定，请稍后再试。',
                    icon: 'none'
                  })
                }

                reject(res.data)
                break
            }
          },
          fail(err) {
            ext.loading && wx.hideLoading()
            
            if (ext.showToast) {
              wx.showToast({
                title: '当前网络不稳定，请稍后再试。',
                icon: 'none',
              })
            }

            reject(err)
          }
        })
      })
    },
    //文件服务器
    file(options) {
      return new Promise((resolve, reject) => {
        //ext中包含loading等配置项
        const ext = options.ext || {}
        if (ext.loading) {
          wx.showLoading({
            title: '拼命加载中',
            mask: true
          })
        }
  
        wx.request({
          url: options.url,
          method: 'POST',
          data: options.params || {},
          success(res) {
            switch (res.data.errcode) {
              case 0:
                ext.loading && wx.hideLoading()

                resolve(res.data.data)
                break
              default:
                ext.loading && wx.hideLoading()

                wx.showToast({
                  title: res.data.errmsg || '当前网络不稳定，请稍后再试。',
                  icon: 'none',
                  duration: 2000
                })
                reject(res.data)
                break
            }
          },
          fail(err) {
            ext.loading && wx.hideLoading()

            wx.showToast({
              title: '当前网络不稳定，请稍后再试。',
              icon: 'none',
              duration: 2000
            })
            reject(err)
          }
        })
      })
    }
  },

  //代理提交请求
  proxy(options) {
    return new Promise((resolve, reject) => {
      this.http.post({ url: options.url, params: options.params, ext: options.ext })
      .then((d) => {
        resolve(d)
      })
      .catch((err) => {
        //登录状态已过期
        if (err && err.errcode === 407) {
          const app = getApp()
          let whoami
          
          this.whoami({
            industryCode: app.globalData.industryCode
          })
          .then((d) => {
            this.http.token = d.sessionId
            wx.setStorageSync('sessionId', d.sessionId)
            whoami = d

            return this.wxLogin()
          })
          .then((d) => {
            whoami.login = 1
            whoami.user = d
            app.globalData.whoami = whoami

            return this.http.post({ url: options.url, params: options.params, ext: options.ext })
          }, () => {
            whoami.login = 0
            whoami.user = {}
            app.globalData.whoami = whoami
          })
          .then((d) => {
            resolve(d)
          })
          .catch((err) => {
            reject(err)
          })
        } else {
          reject(err)
        }
      })
    })
  },

  // 具体接口

  //文件处理
  file(url, params, ext) {
    return this.http.file({url: url, params: params, ext: ext})
  },
  //登录
  login(params, ext) {
    return this.http.post({ url: '/account/login', params: params, ext: ext })
  },
  //微信授权登录
  wxLogin() {
    return new Promise((resolve, reject) => {
      //获取用户的当前设置
      wx.getSetting({
        success: res => {
          //未授权，进入授权页
          if (!res.authSetting['scope.userInfo']) {
            reject({ redirect: true })
            return
          }
          
          //获取登录凭证
          wx.login({
            success: res => {
              const code = res.code

              //小程序启动参数
              const launchOptions = wx.getLaunchOptionsSync()

              wx.getUserInfo({
                withCredentials: true,
                success: res => {
                  //请求后台API接口登录
                  this.login({
                    scene: launchOptions.scene,
                    code: code,
                    encryptedData: res.encryptedData,
                    rawData: res.rawData,
                    signature: res.signature,
                    iv: res.iv,
                    recommendUserId: wx.getStorageSync('recommendUserId')
                  }).then((d) => {
                    resolve(d)
                  })
                  .catch((err) => {
                    reject(err)
                  })
                },
                fail: res => {
                  reject(res)
                }
              })
            },
            fail: res => {
              reject(res)
            }
          })
        },
        fail: () => {
          reject(res)
        }
      })
    })
  },
  //系统配置信息
  whoami(params, ext) {
    return this.http.post({ url: '/account/whoami', params: params, ext: ext })
  },
  //获取广告
  getAds(ext) {
    return this.proxy({ url: '/console/getAds', params: {}, ext: ext })
  },
  //微信文本内容检测
  checkMessage(params, ext) {
    return this.proxy({ url: '/console/checkMessage', params: params, ext: ext })
  },
  //获取海报分类
  getPosterCategories(ext) {
    return this.proxy({ url: '/poster/getPosterCategories', params: {}, ext: ext })
  },
  //获取首页精选海报
  getPosterTop(ext) {
    return this.proxy({ url: '/poster/getPosterTop', params: {}, ext: ext })
  },
  //获取指定属性的海报
  getPostersByAttribute(params, ext) {
    return this.proxy({ url: '/poster/getPostersByAttribute', params: params, ext: ext })
  },
  //查询海报
  queryPoster(params, ext) {
    params.page.pageSize = params.page.pageSize || this.http.pager.limit
    return this.proxy({ url: '/poster/queryPoster', params: params, ext: ext })
  },
  //获取海报设计
  getPosterDesign(params, ext) {
    return this.proxy({ url: '/poster/getPosterDesign', params: params, ext: ext })
  },
  //查询用户海报作品
  queryUserPoster(params, ext) {
    params.page.pageSize = params.page.pageSize || this.http.pager.limit
    return this.proxy({ url: '/poster/queryUserPoster', params: params, ext: ext })
  },
  //获取单个用户海报作品
  getUserPoster(params, ext) {
    return this.proxy({ url: '/poster/getUserPoster', params: params, ext: ext })
  },
  //用户海报作品增删改
  opUserPoster(params, ext) {
    return this.proxy({ url: '/poster/opUserPoster', params: params, ext: ext })
  },
  //查询素材分类（仅图片）
  queryMaterialCategory(ext) {
    return this.proxy({ url: '/material/queryMaterialCategory', params: {}, ext: ext })
  },
  //查询素材（仅图片）
  queryMaterial(params, ext) {
    params.page.pageSize = params.page.pageSize || this.http.pager.limit
    return this.proxy({ url: '/material/queryMaterial', params: params, ext: ext })
  },
  //用户文件操作
  opUserFile(params, ext) {
    return this.proxy({ url: '/material/opUserFile', params: params, ext: ext })
  },
  //查询用户文件
  queryUserFile(params, ext) {
    params.page.pageSize = params.page.pageSize || this.http.pager.limit
    return this.proxy({ url: '/material/queryUserFile', params: params, ext: ext })
  },
  //获取用户信息
  getUser(ext) {
    return this.proxy({ url: '/user/getUser', params: {}, ext: ext })
  },
  //获取用户所有的常用二维码
  getUserQrcodes(ext) {
    return this.proxy({ url: '/user/getUserQrcodes', params: {}, ext: ext })
  },
  //获取用户默认的常用二维码
  getUserDefaultQrcode(ext) {
    return this.proxy({ url: '/user/getUserDefaultQrcode', params: {}, ext: ext })
  },
  //用户常用二维码操作
  opUserQrcode(params, ext) {
    return this.proxy({ url: '/user/opUserQrcode', params: params, ext: ext })
  },
  //获取用户主体信息
  getUserPrincipal(ext) {
    return this.proxy({ url: '/user/getUserPrincipal', params: {}, ext: ext })
  },
  //用户主体信息操作
  opUserPrincipal(params, ext) {
    return this.proxy({ url: '/user/opUserPrincipal', params: params, ext: ext })
  },
  //查询积分规则
  queryPointSetting(ext) {
    return this.proxy({ url: '/user/queryPointSetting', params: {}, ext: ext })
  },
  //获取用户积分明细记录
  getPointLogs(params, ext) {
    return this.proxy({ url: '/user/getPointLogs', params: params, ext: ext })
  },
  //新增积分明细记录
  addPointLog(params, ext) {
    return this.proxy({ url: '/user/addPointLog', params: params, ext: ext })
  },
  //验证用户今天是否已签到
  verifyUserHasSignin(params, ext) {
    return this.proxy({ url: '/user/verifyUserHasSignin', params: params, ext: ext })
  },
}