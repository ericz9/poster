import api from '../../utils/api.js'
import util from '../../utils/util.js'
import store from '../../utils/store.js'
const app = getApp()

Component({
  data: {
    //数据初始化加载状态
    //loading 加载中
    //success 成功
    //apiFailed API接口请求失败，可重试
    loading: 'loading',
    loadingRetry: false, //加载失败后，尝试重试获取数据时为TRUE
    whoami: {}, //系统配置信息
    showAddTips: true, //是否显示“添加到我的小程序”
    //瀑布流左边布局
    left: {
      height: 0,
      posters: []
    },
    //瀑布流右边布局
    right: {
      height: 0,
      posters: []
    },
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
    },
  },
  methods: {
    onShow() {
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
        
        //显示导航条加载动画
        wx.showNavigationBarLoading()

        if (app.globalData.whoami.login === 1) {
          let left = {height: 0, posters: []}
          let right = {height: 0, posters: []}

          //查询作品
          this.queryUserPoster(left, right, {
            page: {
              pageIndex: 1
            }
          })
          .then((d) => {
            this.setData({
              loading: 'success',
              loadingRetry: false,
              whoami: app.globalData.whoami,
              showAddTips: !store.isCloseAddTips(),
              left: d.left,
              right: d.right,
              'pager.hasMore': d.page.totalPage > 1
            })
            wx.hideNavigationBarLoading()
            resolve()
          }, () => {
            failed.loading = failed.loading || 'apiFailed'
            return Promise.reject()
          })
          .catch((err) => {
            this.setData(failed)
            wx.hideNavigationBarLoading()
            reject(err)
          })
        } else {
          this.setData({
            loading: 'success',
            loadingRetry: false,
            whoami: app.globalData.whoami,
            showAddTips: !store.isCloseAddTips()
          })
          wx.hideNavigationBarLoading()
          resolve()
        }
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
    //登录
    onClickLogin() {
      util.login()
      .then(() => {
        this.initialize()
      })
    },
    //关闭“添加到我的小程序”的显示状态
    onClickCloseAddTips() {
      store.closeAddTips()
      this.setData({
        showAddTips: false
      })
    },
    //去首页
    onClickGotoHome() {
      wx.switchTab({ url: '/pages/home/index' })
    },
    //查询海报
    queryUserPoster(left, right, params, ext) {
      return new Promise((resolve, reject) => {
        api.queryUserPoster(params, ext)
        .then((d) => {
          d.data.forEach((item) => {
            //填充图片尺寸
            item.imageShowUrl = util.imageResizer(item.imageUrl, '375', '750', 'm')

            //组装瀑布流数据
            const height = parseInt(Math.round(item.imageHeight * 345 / item.imageWidth))
            item.imageHeight = height

            //判断左右两侧当前的累计高度，来确定item应该放置在左边还是右边
            if (left.height == right.height || left.height < right.height) {
              left.posters.push(item)
              left.height += height
            } else {
              right.posters.push(item)
              right.height += height
            }
          })

          resolve({
            left: left,
            right: right,
            page: d.page
          })
        })
        .catch(() => {
          reject()
        })
      })
    },
    //点击海报
    onClickPoster(evt) {
      util.login()
      .then(() => {
        wx.navigateTo({url: `/pages/poster/design/index?workId=${evt.currentTarget.id}`})
      })
    },
    //删除海报
    onClickDeletePoster(evt) {
      wx.showModal({
        title: '提示',
        content: '确认要删除这个作品吗？',
        success: (res) => {
          if (res.confirm) {
            wx.showLoading({
              title: '正在删除中',
              mask: true
            })

            api.opUserPoster({
              opType: 3,
              id: evt.currentTarget.id
            })
            .then(() => {
              let left = {height: 0, posters: []}
              let right = {height: 0, posters: []}

              //查询作品
              return this.queryUserPoster(left, right, {
                page: {
                  pageIndex: 1
                }
              })
            })
            .then((d) => {
              this.setData({
                left: d.left,
                right: d.right,
                'pager.hasMore': d.page.totalPage > 1
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
    //加载分页数据
    loadMore() {
      if (!this.data.pager.hasMore
        || this.data.pager.loading === 'loading') {
        return
      }
      
      this.data.pager.start += 1
      this.data.pager.loading = 'loading'
      this.setData({
        pager: this.data.pager
      })

      let left = this.data.left
      let right = this.data.right
      this.queryUserPoster(left, right, {
        page: {
          pageIndex: this.data.pager.start
        }
      }).then((d) => {
        this.data.pager.loading = 'success'
        this.data.pager.hasMore = d.page.totalPage > this.data.pager.start

        this.setData({
          left: d.left,
          right: d.right,
          pager: this.data.pager
        })
      }).catch(() => {
        //重新加载时再次失败，重置标识
        this.data.pager.start = this.data.pager.start > 1 ? this.data.pager.start - 1 : 1
        this.data.pager.loading = 'fail'
        this.setData({
          pager: this.data.pager
        })
      })
    },
    //监听用户上拉触底事件
    onReachBottom(evt) {
      this.loadMore()
    },
    //下拉刷新
    onPullDownRefresh() {
      //重置分页信息
      this.data.pager = {
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

      this.initialize()
      .then(() => {
        wx.stopPullDownRefresh()
      })
      .catch(() => {
        wx.stopPullDownRefresh()
      })
    },
    //监听分享事件
    onShareAppMessage(res) {
      if (res.from === 'button') {
        return {
          title: `【${app.globalData.whoami.user.nickName || '有人'}@我】快来看看我做的海报`,
          path: `/pages/poster/design-finish/index?id=${res.target.id}&imageUrl=${res.target.dataset.imageUrl}&share=1&recommendUserId=${app.globalData.whoami.user.id}`,
          imageUrl: util.imageResizer(res.target.dataset.imageUrl, '375', '750', 'm')
        }
      } else {
        return {
          title: app.globalData.whoami.config.shareTitle,
          path: `/pages/home/index?recommendUserId=${app.globalData.whoami.user.id}`,
          imageUrl: util.env().fileServerUrl + app.globalData.whoami.config.shareImage
        }
      }
    }
  }
})
