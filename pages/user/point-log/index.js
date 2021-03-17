import api from '../../../utils/api.js'
const app = getApp()

Component({
  data: {
    //数据初始化加载状态
    //loading 加载中
    //success 成功
    //apiFailed API接口请求失败，可重试
    loading: 'loading',
    loadingRetry: false, //加载失败后，尝试重试获取数据时为TRUE
    pointLogs: [], //积分记录
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

        //获取积分明细记录
        this.getPointLogs()
        .then((d) => {
          this.setData({
            loading: 'success',
            loadingRetry: false,
            pointLogs: d.data,
            'pager.hasMore': d.page.totalPage > 1
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
    //获取用户积分明细记录
    getPointLogs() {
      return new Promise((resolve, reject) => {
        api.getPointLogs({
          page: {
            pageIndex: this.data.pager.start
          }
        })
        .then((d) => {
          resolve(d)
        })
        .catch(() => {
          reject()
        })
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

      this.getPointLogs()
      .then((d) => {
        this.data.pointLogs = [...this.data.pointLogs, ...d.data]
        this.data.pager.loading = 'success'
        this.data.pager.hasMore = d.page.totalPage > this.data.pager.start
        this.setData({
          pointLogs: this.data.pointLogs,
          pager: this.data.pager
        })
      })
      .catch(() => {
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
    }
  }
})