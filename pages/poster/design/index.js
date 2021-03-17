import api from '../../../utils/api.js'
import util from '../../../utils/util.js'
const app = getApp()

Component({
  isSave: false,
  params: {}, //查询参数
  navigateToPoint: false, //跳转到“我的积分”页面

  data: {
    //数据初始化加载状态
    //loading 加载中
    //success 成功
    //apiFailed API接口请求失败，可重试
    loading: 'loading',
    loadingRetry: false, //加载失败后，尝试重试获取数据时为TRUE
    page: {}, //画布信息
    poster: {}, //海报
    history: [], //历史操作（保存整个海报的JSON数据）
    historyIndex: -1, //当前步骤索引
    paletteJson: '', //生成的palette的JSON数据
    currentComponent: {}, //当前选中的组件
    showChangeTextDialog: false, //是否显示更改文字的弹出层
    showChangeColorDialog: false, //是否显示更改颜色的弹出层
    textSizeCss: {
      minHeight: 100
    },
    //文本颜色
    colors: [
      ['#d81b43','#e91e4e','#ec4064','#f0627d','#f48fa0','#ffffff'],
      ['#8e24aa','#9c27b0','#ab47bc','#ba68c8','#ce93d8','#e0e0e0'],
      ['#512da8','#5e35b1','#673ab7','#7e57c2','#9575cd','#b5b6b6'],
      ['#303f9f','#3949ab','#5c6bc0','#7986cb','#9fa8da','#93959d'],
      ['#1e88e5','#2196f3','#42a5f5','#64b5f6','#90caf9','#838386'],
      ['#00897b','#009688','#26a69a','#80cbc4','#b2dfdb','#5a5a5a'],
      ['#43a047','#4caf50','#81c784','#a5d6a7','#c8e6c9','#373737'],
      ['#fbc02d','#fdd835','#ffeb3b','#fff176','#fff59d','#232323'],
      ['#f57c00','#fb8c00','#ffa726','#ffb74d','#ffcc80','#161616'],
      ['#e64a19','#f4511e','#ff5722','#ff8a65','#ffab91','#000000']
    ],
    showChangeSizeDialog: false, //是否显示更改字号的弹出层
    showChangeImageDialog: false, //是否显示更改图片的弹出层
    changeImage: {
      //是否已初始化
      initialize: false,
      upload: {
        images: [], //图片列表
        opImage: false, //编辑图片
        scrollTop: 0, //切换分类后回到顶部
        //分页信息
        pager: {
          //页码
          start: 1,
          //加载状态
          //loading 加载中
          //success 成功
          //fail 失败
          loading: 'success',
          //是否还有下一页更多数据
          hasMore: true
        }
      },
      store: {
        //图片查询项
        filter: {
          categoryId: '',
        },
        categories:[], //图片分类
        images: [], //图片列表
        scrollTop: 0, //切换分类后回到顶部
        //分页信息
        pager: {
          //页码
          start: 1,
          //加载状态
          //loading 加载中
          //success 成功
          //fail 失败
          loading: 'success',
          //是否还有下一页更多数据
          hasMore: true
        }
      }
    },
    showChangeQrcodeDialog: false, //是否显示更改二维码的弹出层
    opQrcode: false, //编辑常用二维码
    qrcodes: [], //常用二维码列表
    //图片裁剪
    imageCrop: {
      visible: false,
      type: '', //需要处理的图片类型（logo、qrcode、upload）
      url: '', //裁剪图片地址,
      //裁剪尺寸
      size: { width: 300, height: 300 },
      cropSizePercent: 1, //裁剪框显示比例
      borderColor: '#fff', //裁剪框边框颜色
    },
    showPointLessDialog: false, //是否显示积分不足的弹出层
    userPoint: 0, //用户可用积分
  },
  methods: {
    onLoad(params) {
      this.params = params

      if (app.globalData.whoami) {
        this.initialize()
      } else {
        app.launchCallback = () => {
          this.initialize()
        }
      }
    },
    onShow() {
      //从“我的积分”页面返回
      if (this.navigateToPoint) {
        //检查积分是否足够
        api.getUser()
        .then((d) => {
          if (d.point >= app.globalData.whoami.config.posterDesignUnitPoint) {
            this.setData({
              showPointLessDialog: false
            })
          }
        })
      }
    },
    //初始化
    initialize() {
      console.log(app.globalData.whoami)
      return new Promise((resolve, reject) => {
        let failed = { loading: '' }
        let principal, defaultQrcode

        //获取用户主体信息
        api.getUserPrincipal()
        .then((d) => {
          principal = d

          //获取用户默认的常用二维码
          return api.getUserDefaultQrcode()
        }, () => {
          failed.loading = failed.loading || 'apiFailed'
          return Promise.reject()
        })
        .then((d) => {
          defaultQrcode = d

          //获取海报数据JSON
          return this.getTemplateJson()
        }, () => {
          failed.loading = failed.loading || 'apiFailed'
          return Promise.reject()
        })
        .then((d) => {
          let poster = JSON.parse(d)

          //画布相关信息
          const sysInfo = wx.getSystemInfoSync()
          let page = {}
          page.zoom = (sysInfo.windowWidth - 115) * 100 / 750
          page.scaleHeight = poster.height * page.zoom / 90

          const reg1 = new RegExp('<br/>','g')
          const reg2 = new RegExp('&nbsp;','g')

          //二维码、主体信息替换
          for (let com of poster.widgets) {
            //替换换行符
            if (com.type === 'w-text') {
              com.text = com.text.replace(reg1, '\n')
              com.text = com.text.replace(reg2, ' ')
            }

            //替换二维码、主体信息
            switch (com.code) {
              case 'qrcode':
                if (defaultQrcode && defaultQrcode.value) {
                  com.imgUrl = util.imageClear(defaultQrcode.value)
                }
                break
              case 'logo':
                com.imgUrl = util.imageClear(principal.logoSQUrl)
                com.imgOriginalUrl = principal.logoSQUrl
                break
              case 'principalName':
                com.text = principal.principalName
                break
              case 'contactWay':
                com.text = principal.contactWay
                break
              case 'address':
                com.text = principal.address
                break
            }
          }

          //显示当前日期
          //忽略已生成的设计
          if (this.params.id) {
            const currentDateSetting = poster.setting.filter(k => k.parentKey === 'currentDateColor')[0]
            if (currentDateSetting && currentDateSetting.value) {
              //当前日期
              const date = new Date()
              const year = date.getFullYear()
              const month = date.getMonth() + 1
              const day = date.getDate()
              const week = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][date.getDay()]

              //组件公用部分
              let widget = {}
              widget.name = '文本'
              widget.type = 'w-text'
              widget.editable = false
              widget.lineHeight = 1
              widget.letterSpacing = 0
              widget.letterSpacing = 0
              widget.fontWeight = 'normal'
              widget.fontStyle = 'normal'
              widget.textDecoration = 'none'
              widget.textColor = poster.currentDateColor
              widget.textAlign = 'right'
              widget.opacity = 1
              widget.parent = -1
              widget.setting = []
              widget.fontClass = {
                name: '默认字体',
                value: ''
              }

              //年月
              let monthWidget = Object.assign({}, widget)
              monthWidget.uuid = util.uuid().replace('-', '').substr(0, 12)
              monthWidget.width = 160
              monthWidget.left = 515
              monthWidget.top = 25
              monthWidget.fontSize = 24
              monthWidget.text = `${year}年${month}月`
              monthWidget.record = {
                width: monthWidget.width,
                minWidth: monthWidget.width,
                height: monthWidget.fontSize,
                minHeight: monthWidget.fontSize
              }

              //日
              let dayWidget = Object.assign({}, widget)
              dayWidget.uuid = util.uuid().replace('-', '').substr(0, 12)
              dayWidget.width = 160
              dayWidget.left = 515
              dayWidget.top = 55
              dayWidget.fontSize = 40
              widget.fontWeight = 'bold'
              dayWidget.text = `${day}日`
              dayWidget.record = {
                width: dayWidget.width,
                minWidth: dayWidget.width,
                height: dayWidget.fontSize,
                minHeight: dayWidget.fontSize
              }

              //星期
              let weekWidget = Object.assign({}, widget)
              weekWidget.uuid = util.uuid().replace('-', '').substr(0, 12)
              weekWidget.width = 30
              weekWidget.left = 680
              weekWidget.top = 24
              weekWidget.fontSize = 24
              weekWidget.textAlign = 'center'
              weekWidget.text = week
              weekWidget.record = {
                width: weekWidget.width,
                minWidth: weekWidget.width,
                height: weekWidget.fontSize,
                minHeight: weekWidget.fontSize
              }

              poster.widgets.push(monthWidget, dayWidget, weekWidget)
            }
          }

          this.setData({
            loading: 'success',
            loadingRetry: false,
            page: page,
            poster: poster,
            history: [JSON.stringify(poster)],
            historyIndex: 0
          })

          //循环加载字体
          let promise = Promise.resolve()
          const coms = poster.widgets.filter(k => k.type === 'w-text' && k.fontClass.value)
          let fonts = []
          for (let com of coms) {
            if (fonts.indexOf(com.fontClass.value) < 0) {
              promise = promise.then(() => {
                return new Promise((resolve) => {
                  this.loadFontFace(com.fontClass)
                  .then(() => {
                    fonts.push(com.fontClass.value)
                    resolve()
                  })
                })
              })
            }
          }

          return promise
        }, () => {
          failed.loading = failed.loading || 'apiFailed'
          return Promise.reject()
        })
        .then(() => {
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
    //获取海报模板JSON
    getTemplateJson() {
      return new Promise((resolve, reject) => {
        //从“我的作品”过来，为编辑海报
        if (this.params.workId) {
          api.getUserPoster({
            id: this.params.workId
          })
          .then((d) => {
            resolve(d.templateJson)
          })
          .catch((err) => {
            reject(err)
          })
        } else {
          //为新增海报
          //获取海报设计
          api.getPosterDesign({
            id: this.params.id
          })
          .then((d) => {
            resolve(d.templateJson)
          })
          .catch((err) => {
            reject(err)
          })
        }
      })
    },
    //加载字体
    loadFontFace(font) {
      return new Promise((resolve, reject) => {
        wx.loadFontFace({
          family: font.value,
          //配置项指定是否从凡科获取字体
          source: app.globalData.whoami.config.useFkFontCdn === '1'
            ? `url("https://kt.faisys.com/css/fonts/woff2/${font.value}.woff2")`
            : `url("${app.globalData.env.prod.fileServerUrl}/fonts/${font.lang}/${font.value}.woff2")`,
          success: res => {
            resolve()
          },
          fail: res => {
            reject(res)
          }
        })
      })
    },
    //点击图片（非组件），取消选中组件
    onExitEdit() {
      this.setData({
        currentComponent: {}
      })
    },
    //点击组件
    onClickComponent(evt) {
      let com = this.data.poster.widgets.filter(k => k.uuid === evt.currentTarget.id)[0]
      
      //副本字段
      com.initFontSize = com.fontSize
      
      wx.vibrateShort()
      this.setData({
        currentComponent: Object.assign({}, com)
      })
    },
    //获取当前组件
    getCurrentComponent() {
      let com
      for (let i in this.data.poster.widgets) {
        const item = this.data.poster.widgets[i]
        if (item.uuid === this.data.currentComponent.uuid) {
          com = { instance: item, index: i }
          break
        }
      }

      return com
    },
    //返回包装好的操作历史
    packageHistory(poster) {
      let history = this.data.history
      let historyIndex = this.data.historyIndex

      //下标小于历史列表长度-1，则说明不是在末尾添加记录，需要先删除掉下标之后的数据，否则会出现错乱
      if (historyIndex < history.length - 1) {
        history.splice(historyIndex + 1, history.length - historyIndex - 1)
      }

      //保存当前操作进历史记录
      history.push(JSON.stringify(poster))

      //最多10条历史记录
      if (history.length > 10) {
        history.splice(0, 1)
      }

      return {
        history: history,
        historyIndex: history.length - 1
      }
    },
    //撤销
    onClickUndo() {
      if (this.data.historyIndex > 0 && this.data.history.length > 0) {
        const historyIndex = this.data.historyIndex - 1
        this.setData({
          poster: JSON.parse(this.data.history[historyIndex]),
          currentComponent: {},
          historyIndex: historyIndex
        })
      }
    },
    //恢复
    onClickRedo() {
      if (this.data.historyIndex < this.data.history.length - 1) {
        const historyIndex = this.data.historyIndex + 1
        this.setData({
          poster: JSON.parse(this.data.history[historyIndex]),
          currentComponent: {},
          historyIndex: historyIndex
        })
      }
    },
    //点击“文字”按钮
    onClickChangeText() {
      this.setData({
        showChangeTextDialog: true
      })
    },
    //关闭“文字”弹出层
    onCloseChangeTextDialog() {
      this.setData({
        showChangeTextDialog: false
      })
    },
    //同步到当前组件
    onSetCurrentText(evt) {
      this.setData({
        'currentComponent.text': evt.detail
      })
    },
    //修改文字，同步到海报
    onChangeText() {
      util.checkMessage(this.data.currentComponent.text)
      .then(() => {
        //找到当前组件
        const com = this.getCurrentComponent()

        //更新
        if (com) {
          //历史操作
          let poster = this.data.poster
          poster.widgets[com.index].text = this.data.currentComponent.text
          const pack = this.packageHistory(poster)

          this.setData({
            ['poster.widgets[' + com.index + '].text']: this.data.currentComponent.text,
            showChangeTextDialog: false,
            history: pack.history,
            historyIndex: pack.historyIndex
          })
        }
      })
    },
    //点击“颜色”按钮
    onClickChangeColor() {
      this.setData({
        showChangeColorDialog: true
      })
    },
    //关闭“颜色”弹出层
    onCloseChangeColorDialog() {
      this.setData({
        showChangeColorDialog: false
      })
    },
    //修改颜色，同步到海报
    onChangeColor(evt) {
      //找到当前组件
      const com = this.getCurrentComponent()

      //更新
      if (com) {
        //历史操作
        let poster = this.data.poster
        poster.widgets[com.index].textColor = evt.currentTarget.id
        const pack = this.packageHistory(poster)

        this.setData({
          ['poster.widgets[' + com.index + '].textColor']: evt.currentTarget.id,
          showChangeColorDialog: false,
          history: pack.history,
          historyIndex: pack.historyIndex
        })
      }
    },
    //点击“字号”按钮
    onClickChangeSize() {
      this.setData({
        showChangeSizeDialog: true
      })
    },
    //取消设置字号
    onCancelChangeSize() {
      //找到当前组件
      const com = this.getCurrentComponent()

      if (com) {
        this.setData({
          'currentComponent.fontSize' : this.data.currentComponent.initFontSize,
          ['poster.widgets[' + com.index + '].fontSize']: this.data.currentComponent.initFontSize,
          showChangeSizeDialog: false
        })
      }
    },
    //确认设置字号
    onConfirmChangeSize() {
      //历史操作
      const pack = this.packageHistory(this.data.poster)

      //关闭弹出层即可，字号修改是即时的
      this.setData({
        showChangeSizeDialog: false,
        history: pack.history,
        historyIndex: pack.historyIndex
      })
    },
    //同步设置字号
    onChangeSize(evt) {
      //找到当前组件
      const com = this.getCurrentComponent()

      if (com) {
        this.setData({
          ['poster.widgets[' + com.index + '].fontSize']: evt.detail,
        })
      }
    },
    //点击“换图”按钮
    onClickChangeImage() {
      if (!this.data.changeImage.initialize) {
        //默认加载用户上传的图片
        this.queryUploadImage()
        .then((d) => {
          this.setData({
            'changeImage.upload.images': d.data,
            'changeImage.upload.pager.hasMore': d.page.totalPage > 1,
            'changeImage.upload.opImage': false,
            'changeImage.initialize': true,
            showChangeImageDialog: true
          })
        })
      } else {
        this.setData({
          showChangeImageDialog: true,
          'changeImage.upload.opImage': false
        })
      }
    },
    //点击“换图”按钮（LOGO）
    onClickChangeLogo() {
      let self = this
      wx.chooseImage({
        count: 1,
        sizeType: ['original', 'compressed'],
        sourceType: ['album', 'camera'],
        success (res) {
          self.setData({
            'imageCrop.visible': true,
            'imageCrop.type': 'logo',
            'imageCrop.url': res.tempFilePaths[0],
            'imageCrop.size': { width: 300, height: 300 },
            'imageCrop.cropSizePercent': 1
          })
        }
      })
    },
    //点击“换图”按钮（二维码）
    onClickChangeQrcode() {
      if (this.data.qrcodes.length > 0) {
        this.setData({
          showChangeQrcodeDialog: true,
          opQrcode: false
        })
      } else {
        //获取用户常用二维码
        this.getUserQrcodes()
        .then((d) => {
          this.setData({
            qrcodes: d,
            showChangeQrcodeDialog: true,
            opQrcode: false
          })
        })
      }
    },
    //查询用户上传的图片
    queryUploadImage() {
      return new Promise((resolve, reject) => {
        api.queryUserFile({
          page: {
            pageIndex: this.data.changeImage.upload.pager.start,
            pageSize: 12
          }
        })
        .then((d) => {
          d.data.forEach((item) => {
            item.imageUrl = util.imageResizer(item.path, '300', '225', 'c')
          })

          resolve(d)
        })
        .catch(() => {
          reject()
        })
      })
    },
    //查询图库中的图片
    queryStoreImage() {
      return new Promise((resolve, reject) => {
        api.queryMaterial({
          page: {
            pageIndex: this.data.changeImage.store.pager.start,
            pageSize: 12
          },
          categoryId: this.data.changeImage.store.filter.categoryId
        })
        .then((d) => {
          d.data.forEach((item) => {
            item.imageUrl = util.imageResizer(item.path, '300', '225', 'c')
          })

          resolve(d)
        })
        .catch(() => {
          reject()
        })
      })
    },
    //加载更多用户上传的图片
    loadMoreUploadImages() {
      if (!this.data.changeImage.upload.pager.hasMore
        || this.data.changeImage.upload.pager.loading === 'loading') {
        return
      }

      this.data.changeImage.upload.pager.start += 1
      this.data.changeImage.upload.pager.loading = 'loading'

      this.queryUploadImage()
      .then((d) => {
        //分页信息
        const images = [...this.data.changeImage.upload.images, ...d.data]
        this.data.changeImage.upload.pager.loading = 'success'
        this.data.changeImage.upload.pager.hasMore = d.page.totalPage > this.data.changeImage.upload.pager.start
        
        this.setData({ 
          'changeImage.upload.images': images
        })
      })
      .catch(() => {
        //重新加载时再次失败，重置标识
        this.data.changeImage.upload.pager.start = this.data.changeImage.upload.pager.start > 1 ? this.data.changeImage.upload.pager.start - 1 : 1
        this.data.changeImage.upload.pager.loading = 'fail'
      })
    },
    //点击“换图”按钮
    onChangeImageTab(evt) {
      if (evt.detail.index === 0
        || this.data.changeImage.store.categories.length > 0) {
        return
      }

      let categories = [{
        text: '全部分类', value: ''
      }]

      api.queryMaterialCategory({
        loading: true
      })
      .then((d) => {
        d.forEach((item) => {
          categories.push({
            text: item.name, value: item.id
          })
        })

        return this.queryStoreImage()
      })
      .then((d) => {
        this.setData({
          'changeImage.store.categories': categories,
          'changeImage.store.images': d.data,
          'changeImage.store.pager.hasMore': d.page.totalPage > 1
        })
      })
    },
    //改变图片分类
    onChangeImageCategory(evt) {
      this.data.changeImage.store.filter.categoryId = evt.detail

      this.data.changeImage.store.pager.start = 1
      this.data.changeImage.store.pager.loading = 'success'
      this.data.changeImage.store.pager.hasMore = true

      this.queryStoreImage()
      .then((d) => {
        this.setData({
          'changeImage.store.images': d.data,
          'changeImage.store.pager.hasMore': d.page.totalPage > 1,
          'changeImage.store.scrollTop': 0
        })
      })
    },
    //加载更多图库中的图片
    loadMoreStoreImages() {
      if (!this.data.changeImage.store.pager.hasMore
        || this.data.changeImage.store.pager.loading === 'loading') {
        return
      }

      this.data.changeImage.store.pager.start += 1
      this.data.changeImage.store.pager.loading = 'loading'

      this.queryStoreImage()
      .then((d) => {
        //分页信息
        const images = [...this.data.changeImage.store.images, ...d.data]
        this.data.changeImage.store.pager.loading = 'success'
        this.data.changeImage.store.pager.hasMore = d.page.totalPage > this.data.changeImage.store.pager.start
        
        this.setData({ 
          'changeImage.store.images': images
        })
      })
      .catch(() => {
        //重新加载时再次失败，重置标识
        this.data.changeImage.store.pager.start = this.data.changeImage.store.pager.start > 1 ? this.data.changeImage.store.pager.start - 1 : 1
        this.data.changeImage.store.pager.loading = 'fail'
      })
    },
    //获取用户常用二维码
    getUserQrcodes() {
      return new Promise((resolve, reject) => {
        api.getUserQrcodes()
        .then((d) => {
          d.forEach((item) => {
            item.imageShowUrl = util.imageResizer(item.imageUrl, '300', '300', 'c')
          })

          resolve(d)
        })
        .catch(() => {
          reject()
        })
      })
    },
    //选择图片
    onChooseImage(evt) {
      //找到当前组件
      const com = this.getCurrentComponent()

      //更新
      if (com) {
        //历史操作
        let poster = this.data.poster
        poster.widgets[com.index].imgUrl = util.imageClear(evt.currentTarget.dataset.image)
        const pack = this.packageHistory(poster)

        this.setData({
          ['poster.widgets[' + com.index + '].imgUrl']: util.imageClear(evt.currentTarget.dataset.image),
          showChangeImageDialog: false,
          showChangeQrcodeDialog: false,
          history: pack.history,
          historyIndex: pack.historyIndex
        })
      }
    },
    //关闭“图库”弹出层
    onCloseChangeImageDialog() {
      this.setData({
        showChangeImageDialog: false
      })
    },
    //关闭“常用二维码”弹出层
    onCloseChangeQrcodeDialog() {
      this.setData({
        showChangeQrcodeDialog: false
      })
    },
    //点击“编辑二维码”按钮
    onClickEditQrcode() {
      this.data.qrcodes.forEach((item) => {
        item.checked = false
      })

      this.setData({
        opQrcode: true,
        qrcodes: this.data.qrcodes
      })
    },
    //点击“退出编辑二维码”按钮
    onClickQuitEditQrcode() {
      this.setData({
        opQrcode: false
      })
    },
    //点击“选择二维码”复选框
    onCheckQrcode(evt) {
      //找出该二维码
      let qrcode, qrcodeIndex
      for (let i in this.data.qrcodes) {
        let item = this.data.qrcodes[i]
        if (item.id === evt.currentTarget.id) {
          qrcode = item
          qrcodeIndex = i
          break
        }
      }

      qrcode.checked = !qrcode.checked
      this.setData({
        ['qrcodes[' + qrcodeIndex + ']']: qrcode
      })
    },
    //点击“删除二维码”按钮
    onClickDeleteQrcode() {
      const qrcodes = this.data.qrcodes.filter(k => k.checked)
      if (qrcodes.length < 1) {
        wx.showToast({
          title: '请先选择需要删除的二维码。',
          icon: 'none'
        })
        return
      }

      let self = this
      wx.showModal({
        title: '提示',
        content: `确认要删除这${qrcodes.length}个二维码吗？`,
        success: (res) => {
          if (res.confirm) {
            wx.showLoading({
              title: '正在删除中',
              mask: true
            })

            api.opUserQrcode({
              opType: 3,
              ids: qrcodes.map(k => k.id)
            })
            .then(() => {
              return self.getUserQrcodes()
            })
            .then((d) => {
              self.setData({
                qrcodes: d,
                opQrcode: false
              })

              wx.hideLoading()
            })
            .catch(() => {
              wx.hideLoading()
            })
          }
        }
      })
    },
    //点击“编辑图片”按钮
    onClickEditImage() {
      this.data.changeImage.upload.images.forEach((item) => {
        item.checked = false
      })

      this.setData({
        'changeImage.upload.opImage': true,
        'changeImage.upload.images': this.data.changeImage.upload.images
      })
    },
    //点击“退出编辑图片”按钮
    onClickQuitEditImage() {
      this.setData({
        'changeImage.upload.opImage': false
      })
    },
    //点击“选择图片”复选框
    onCheckImage(evt) {
      //找出该图片
      let image, imageIndex
      for (let i in this.data.changeImage.upload.images) {
        let item = this.data.changeImage.upload.images[i]
        if (item.id === evt.currentTarget.id) {
          image = item
          imageIndex = i
          break
        }
      }

      image.checked = !image.checked
      this.setData({
        ['changeImage.upload.images[' + imageIndex + ']']: image
      })
    },
    //点击“删除图片”按钮
    onClickDeleteImage() {
      const images = this.data.changeImage.upload.images.filter(k => k.checked)
      if (images.length < 1) {
        wx.showToast({
          title: '请先选择需要删除的图片。',
          icon: 'none'
        })
        return
      }

      let self = this
      wx.showModal({
        title: '提示',
        content: `确认要删除这${images.length}张图片吗？`,
        success: (res) => {
          if (res.confirm) {
            wx.showLoading({
              title: '正在删除中',
              mask: true
            })

            api.opUserFile({
              opType: 3,
              ids: images.map(k => k.id)
            })
            .then(() => {
              return self.queryUploadImage()
            })
            .then((d) => {
              self.setData({
                'changeImage.upload.images': d.data,
                'changeImage.upload.opImage': false
              })

              wx.hideLoading()
            })
            .catch(() => {
              wx.hideLoading()
            })
          }
        }
      })
    },
    //点击“上传图片”按钮
    onClickUploadImage(evt) {
      //最大上传数量
      if ((evt.currentTarget.dataset.type === 'qrcode' && this.data.qrcodes.length >= app.globalData.whoami.config.userMaxUploadQrcode)
        || (evt.currentTarget.dataset.type === 'upload' && this.data.changeImage.upload.images.length >= app.globalData.whoami.config.userMaxUploadImage)) {
          wx.showModal({
            title: '提示',
            content: evt.currentTarget.dataset.type === 'qrcode'
              ? `最多可上传${app.globalData.whoami.config.userMaxUploadQrcode}张二维码哦`
              : `最多可上传${app.globalData.whoami.config.userMaxUploadImage}张图片哦`,
            showCancel: false
          })
      } else {
        let self = this
        wx.chooseImage({
          count: 1,
          sizeType: ['original', 'compressed'],
          sourceType: ['album', 'camera'],
          success (res) {
            self.setData({
              'imageCrop.visible': true,
              'imageCrop.type': evt.currentTarget.dataset.type,
              'imageCrop.url': res.tempFilePaths[0],
              'imageCrop.size': evt.currentTarget.dataset.type === 'qrcode' ? { width: 300, height: 300 } : { width: 300, height: 225 },
              'imageCrop.cropSizePercent': evt.currentTarget.dataset.type === 'qrcode' ? 1 : 0.75
            })
          }
        })
      }
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
          const file = JSON.parse(res.data)
          if (file.errcode === 0) {
            //需要处理的图片类型（logo、qrcode、upload）
            switch (self.data.imageCrop.type) {
              case 'logo':
                {
                  //找到当前组件
                  const com = self.getCurrentComponent()

                  //更新
                  if (com) {
                    //历史操作
                    let poster = self.data.poster
                    poster.widgets[com.index].imgUrl = util.imageClear(file.data.url)
                    const pack = self.packageHistory(poster)

                    self.setData({
                      ['poster.widgets[' + com.index + '].imgUrl']: util.imageClear(file.data.url),
                      ['poster.widgets[' + com.index + '].imgOriginalUrl']: file.data.url,
                      history: pack.history,
                      historyIndex: pack.historyIndex,
                      'imageCrop.visible': false
                    })
                  }
                  
                  wx.hideLoading()
                }
                break
              case 'qrcode':
                {
                  api.opUserQrcode({
                    opType: 1,
                    imageUrl: file.data.url,
                    isDefault: 0
                  })
                  .then(() => {
                    return self.getUserQrcodes()
                  })
                  .then((d) => {
                    self.setData({
                      'imageCrop.visible': false,
                      qrcodes: d
                    })
                    
                    wx.hideLoading()
                  })
                  .catch(() => {
                    wx.hideLoading()
                  })
                }
                break
              case 'upload':
                //同步到用户文件上传记录
                api.opUserFile({
                  opType: 1,
                  id: file.data.id,
                  name: file.data.name.substr(0, 100),
                  extension: file.data.extension,
                  size: file.data.size,
                  path: file.data.url,
                  width: file.data.width,
                  height: file.data.height
                })
                .then(() => {
                  self.data.changeImage.upload.pager.start = 1
                  return self.queryUploadImage()
                })
                .then((d) => {
                  self.setData({ 
                    'imageCrop.visible': false,
                    'changeImage.upload.images': d.data,
                    'changeImage.upload.pager.hasMore': d.page.totalPage > 1
                  })
                  
                  wx.hideLoading()
                })
                .catch(() => {
                  wx.hideLoading()
                })
                break
            }
          } else {
            wx.hideLoading()
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
    //删除组件
    onClickDelete() {
      //找到当前组件
      const com = this.getCurrentComponent()

      let poster = this.data.poster
      poster.widgets.splice(com.index, 1)

      //历史操作
      const pack = this.packageHistory(poster)
      this.setData({
        poster: poster,
        currentComponent: {},
        history: pack.history,
        historyIndex: pack.historyIndex
      })
    },
    //获取需要生成palette的JSON数据
    getPaletteJson() {
      //将包含自定义字体的文字转换为图片
      let promise = Promise.resolve()
      const coms = this.data.poster.widgets.filter(k => k.type === 'w-text' && k.fontClass.value)
      let fonts = []
      for (let com of coms) {
        promise = promise.then(() => {
          return new Promise((resolve) => {
            api.file(
              `${util.env().fileServerUrl}/api/poster/convertFontToImage`, {
              width: com.record.width,
              height: com.record.height,
              text: com.text,
              fontLang: com.fontClass.lang,
              fontFamily: com.fontClass.value,
              fontSize: com.fontSize,
              color: com.textColor,
              lineHight: com.lineHeight * com.fontSize,
              fontWeight: com.fontWeight,
              fontStyle: com.fontStyle,
              textDecoration: com.textDecoration,
              backgroundColor: com.backgroundColor,
              textAlign: com.textAlign
            })
            .then((d) => {
              fonts.push({
                uuid: com.uuid,
                imgUrl: util.imageClear(d)
              })
              resolve()
            })
          })
        })
      }

      promise.then(() => {
        let paletteJson = {
          background: this.data.poster.backgroundColor,
          width: `${this.data.poster.width}px`,
          height: `${this.data.poster.height}px`,
          borderRadius: 0,
          views: []
        }

        this.data.poster.widgets.forEach((com) => {
          let view = {}
          view.css = {
            width: `${com.record.width}px`,
            height: `${com.record.height}px`,
            left: `${com.left}px`,
            top: `${com.top}px`
          }
  
          switch (com.type) {
            case 'w-image':
              view.type = 'image'
              view.url = com.imgUrl
              view.css.mode = 'scaleToFill'
              view.css.borderRadius = `${com.radiusTopLeft}px ${com.radiusTopRight}px ${com.radiusBottomRight}px ${com.radiusBottomLeft}px`
              break
            case 'w-text':
              if (com.fontClass.value) {
                const font = fonts.filter(k => k.uuid === com.uuid)[0]
                if (font) {
                  view.type = 'image'
                  view.url = font.imgUrl
                  view.css.mode = 'scaleToFill'
                  view.css.borderRadius = 0
                }
              } else {
                view.type = 'text'
                view.text = com.text
                view.css.fontSize = `${com.fontSize}px`
                view.css.color = com.textColor
                //view.css.maxLines = 
                view.css.lineHeight = `${com.lineHeight * com.fontSize}px`
                view.css.fontWeight = com.fontWeight
                view.css.textDecoration = com.textDecoration
                view.css.textStyle = com.fontStyle
                view.css.fontFamily = com.fontClass.value
                view.css.background = com.backgroundColor
                //view.css.padding = 
                view.css.textAlign = com.textAlign
              }
              break
            case 'w-line':
              view.type = 'rect'
              view.css.color = com.backgroundColor
              break
            case 'w-circle':
              view.type = 'rect'
              view.css.borderRadius = `${(com.record.width + com.size * 2) * 0.5}px` //只可绘制圆形
              view.css.borderWidth = `${com.size}px`
              view.css.borderColor = com.color
              view.css.color = com.backgroundColor || 'transparent'
              break
            case 'w-rectangle':
              view.type = 'rect'
              view.css.borderRadius = `${com.radiusTopLeft}px` //painter只可设置统一的radius
              view.css.borderWidth = `${com.size}px`
              view.css.borderColor = com.color
              view.css.color = com.backgroundColor || 'transparent'
              break
          }
  
          paletteJson.views.push(view)
        })
  
        this.setData({
          paletteJson: paletteJson
        })
      })
    },
    //保存图片
    onImgOK(evt) {
      if (this.isSave) {
        this.onSave(evt.detail.path)
      }
    },
    //点击“生成海报”按钮
    onClickSave() {
      //不强制替换
      // const com = this.data.poster.widgets.filter(k => k.type === 'w-image' && k.code === 'qrcode')[0]
      // if (com) {
      //   //未更换二维码
      //   if (com.imgUrl.indexOf('/images/poster_user/') < 0) {
      //     wx.showModal({
      //       title: '提示',
      //       content: '你需要将海报的示范二维码，替换成你的真实二维码',
      //       showCancel: false
      //     })
      //     return
      //   }
      // }

      //积分是否足够
      api.getUser()
      .then((d) => {
        if (d.point < app.globalData.whoami.config.posterDesignUnitPoint) {
          this.setData({
            showPointLessDialog: true,
            userPoint: d.point
          })
        } else {
          wx.showModal({
            title: '提示',
            content: `生成海报需要消耗${app.globalData.whoami.config.posterDesignUnitPoint}积分，确认继续吗？`,
            success: (res) => {
              if (res.confirm) {
                this.onSave()
              }
            }
          })
        }
      })
    },
    //点击“我要领积分”按钮
    onClickGotoPoint() {
      this.navigateToPoint = true
      wx.navigateTo({url: '/pages/user/point/index'})
    },
    //保存图片
    onSave(imgPath) {
      wx.showLoading({
        title: '海报生成中',
        mask: true
      })

      if (!this.isSave) {
        this.isSave = true
        this.getPaletteJson()
      } else if (imgPath) {
        //是否需要更换默认二维码
        let changeToDefaultQrcodeId = ''
        const com = this.data.poster.widgets.filter(k => k.type === 'w-image' && k.code === 'qrcode')[0]
        if (com && this.data.qrcodes.length > 0) {
          const qrcode = this.data.qrcodes.filter(k => util.imageClear(k.imageUrl) === com.imgUrl)[0]
          if (qrcode.isDefault === 0) {
            changeToDefaultQrcodeId = qrcode.id
          }
        }

        let self = this
        //保存截屏图片
        wx.uploadFile({
          url: `${util.env().fileServerUrl}/api/upload/index`,
          filePath: imgPath,
          name: 'file',
          formData: {
            'apiKey': app.globalData.whoami.config.fileServerApiKey,
            'category': 'poster_user'
          },
          success(res) {
            const file = JSON.parse(res.data)

            //同步修改主体信息
            let principal = {}
            for (let com of self.data.poster.widgets) {
              switch (com.code) {
                case 'logo':
                  principal.logoSQUrl = com.imgOriginalUrl
                  break
                case 'principalName':
                  principal.principalName = com.text
                  break
                case 'contactWay':
                  principal.contactWay = com.text
                  break
                case 'address':
                  principal.address = com.text
                  break
              }
            }

            //服务端保存
            api.opUserPoster({
              opType: !self.params.workId ? 1 : 2,
              id: self.params.workId, //从“我的作品”进入，修改作品
              posterId: self.params.id,
              imageUrl: file.data.url,
              imageWidth: file.data.width,
              imageHeight: file.data.height,
              paletteJson: JSON.stringify(self.data.paletteJson),
              templateJson: JSON.stringify(self.data.poster),
              principal: principal,
              changeToDefaultQrcodeId: changeToDefaultQrcodeId
            })
            .then((d) => {
              self.isSave = false
              let saveImage = 0
              wx.saveImageToPhotosAlbum({
                filePath: imgPath,
                success() {
                  saveImage = 1
                },
                complete() {
                  wx.hideLoading()
                  wx.navigateTo({url: `/pages/poster/design-finish/index?id=${d.value}&imageUrl=${file.data.url}&saveImage=${saveImage}`})
                }
              })
            })
            .catch(() => {
              wx.hideLoading()
            })
          },
          fail() {
            wx.hideLoading()
          }
        })
      }
    }
  }
})
