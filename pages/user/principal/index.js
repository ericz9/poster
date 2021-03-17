import api from '../../../utils/api.js'
import util from '../../../utils/util.js'
const app = getApp()

Component({
  data: {
    //数据初始化加载状态
    //loading 加载中
    //success 成功
    //apiFailed API接口请求失败，可重试
    loading: 'loading',
    loadingRetry: false, //加载失败后，尝试重试获取数据时为TRUE
    form: {}, //主体信息
    //图片裁剪
    imageCrop: {
      visible: false,
      url: '', //裁剪图片地址,
      //裁剪尺寸
      size: { width: 200, height: 200 },
      cropSizePercent: 1, //裁剪框显示比例
      borderColor: '#fff', //裁剪框边框颜色
    }
  },
  methods: {
    onLoad() {
      if (app.globalData.whoami) {
        this.initialize()
      } else {
        app.launchCallback = () => {
          this.initialize()
        }
      }
    },
    //初始化
    initialize() {
      return new Promise((resolve, reject) => {
        let failed = { loading: '' }

        //用户主体信息
        api.getUserPrincipal()
        .then((d) => {
          d.logoSQShowUrl = util.imageResizer(d.logoSQUrl, '200', '200', 'c')

          this.setData({
            loading: 'success',
            loadingRetry: false,
            form: Object.assign({risky: []}, d)
          })

          resolve()
        }, () => {
          failed.loading = failed.loading || 'apiFailed'
          return Promise.reject()
        })
        .catch((err) => {
          this.setData(failed)
          reject(err)
        })
      })
    },
    //初始化失败时重新加载
    reInitialize() {
      this.setData({
        loadingRetry: true
      })
      this.initialize().catch(() => {
        //重新加载时再次失败，重置标识
        this.setData({
          loadingRetry: false
        })
      })
    },
    //上传图片
    onClickUploadImage() {
      let self = this
      wx.chooseImage({
        count: 1,
        sizeType: ['original', 'compressed'],
        sourceType: ['album', 'camera'],
        success (res) {
          self.setData({
            'imageCrop.visible': true,
            'imageCrop.url': res.tempFilePaths[0]
          })
        }
      })
    },
    //关闭裁剪
    onCloseCropCallback() {
      this.setData({
        'imageCrop.visible': false
      })
    },
    //图片裁剪完成
    onCropCallback(evt) {
      let self = this
      wx.showLoading({
        title: '努力上传中',
        mask: true
      })

      wx.uploadFile({
        url: `${util.env().fileServerUrl}/api/upload/index`,
        filePath: evt.detail.resultSrc,
        name: 'file',
        formData: {
          'apiKey': app.globalData.whoami.config.fileServerApiKey,
          'category': 'poster_user',
          'secCheck': 1,
          'industryCode': app.globalData.industryCode
        },
        success(res) {
          wx.hideLoading()
          const file = JSON.parse(res.data)

          if (file.errcode === 0) {
            self.setData({
              'imageCrop.visible': false,
              'form.logoSQUrl': file.data.url,
              'form.logoSQShowUrl': util.imageResizer(file.data.url, '200', '200', 'c')
            })
          } else {
            wx.showToast({
              title: file.errmsg,
              icon: 'none'
            })
          }
        },
        fail() {
          wx.hideLoading()
        }
      })
    },
    //保存表单中的门店名称
    onSetPrincipalName(evt) {
      this.checkMessage('principalName', evt.detail.value)
    },
    //保存表单中的联系方式
    onSetContactWay(evt) {
      this.checkMessage('contactWay', evt.detail.value)
    },
    //保存表单中的地址
    onSetAddress(evt) {
      this.checkMessage('address', evt.detail.value)
    },
    //微信文本内容安全检测
    checkMessage(field, value) {
      if (this.data.form[field] === value) {
        return
      }

      let updateData = {}
      updateData[`form.${field}`] = value

      util.checkMessage(value)
      .then(() => {
        const index = this.data.form.risky.indexOf(field)
        index > -1 && this.data.form.risky.splice(index, 1)
        this.setData(updateData)
      })
      .catch(() => {
        this.data.form.risky.push(field)
        this.setData(updateData)
      })
    },
    //提交表单
    formSubmit(evt) {
      //重复提交控制
      if (this.data.form.disabledSubmit) {
        return
      }

      //是否包含敏感信息
      if (this.data.form.risky.length > 0) {
        wx.showToast({
          title: '您输入的内容包含敏感信息，请重新输入。',
          icon: 'none'
        })
        return
      }

      this.setData({
        'form.disabledSubmit': true
      })

      //保存用户主体信息
      api.opUserPrincipal({
        principalName: (evt.detail.value.principalName || '').replace(/\s+/g, ''),
        contactWay: this.data.form.contactWay,
        address: (evt.detail.value.address || '').replace(/\s+/g, ''),
        logoSQUrl: this.data.form.logoSQUrl
      })
      .then(() => {
        wx.showToast({
          title: '保存成功'
        })
        
        this.setData({
          'form.disabledSubmit': false
        })
      })
      .catch(() => {
        this.setData({
          'form.disabledSubmit': false
        })
      })
    }
  }
})
