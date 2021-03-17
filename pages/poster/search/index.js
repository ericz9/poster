import api from '../../../utils/api.js'
import util from '../../../utils/util.js'
import store from '../../../utils/store.js'
const app = getApp()

Component({
  params: {}, //查询参数

  data: {
    //数据初始化加载状态
    //init 进入界面时的初始状态，直至触发搜索动作
    //loading 加载中
    //success 成功
    //apiFailed API接口请求失败，可重试
    loading: 'init',
    loadingRetry: false, //加载失败后，尝试重试获取数据时为TRUE
    kw: '', //搜索关键词
    historyKws: [], //历史搜索关键词
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
    //初始化
    initialize() {
      //历史搜索关键词
      const historyKws = store.getKw()
      this.setData({
        historyKws: historyKws
      })
    },
    //失败时重新搜索
    reInitialize() {
      this.setData({
        loadingRetry: true
      })
      this.onSearch().catch(() => {
        //重新加载时再次失败，重置标识
        this.setData({
          loadingRetry: false
        })
      })
    },
    //点击搜索关键词
    onClickKw(evt) {
      this.setData({
        kw: evt.currentTarget.dataset.kw
      })
      this.onSearch()
    },
    //搜索关键词改变
    onChangeKw(evt) {
      this.setData({
        kw: evt.detail
      })
    },
    //清空搜索关键词
    onClearKw() {
      this.setData({
        kw: '',
        loading: 'init'
      })
    },
    //删除搜索历史记录
    onDeleteKw() {
      store.clearKw(() => {
        this.setData({
          historyKws: []
        })
      })
    },
    //搜索海报
    onSearch() {
      return new Promise((resolve, reject) => {
        let left = {height: 0, posters: []}
        let right = {height: 0, posters: []}
        
        this.queryPoster(left, right, {
          name: this.data.kw,
          page: {
            pageIndex: 1
          }
        }, {
          loading: true
        }).then((d) => {
          this.data.pager.loading = 'success'
          this.data.pager.hasMore = d.page.totalPage > 1

          let updateData = {
            loading: 'success',
            loadingRetry: false,
            left: d.left,
            right: d.right,
            pager: this.data.pager
          }

          //写入历史搜索
          let kws = this.data.historyKws
          const kw = this.data.kw.replace(/\s*/g,'')
          if (kw && kw.length > 0) {
            const index = kws.indexOf(kw)
            if (index > -1) {
              kws.splice(index, 1)
            } else if (kws.length >= 10) {
              kws.splice(kws.length - 1, 1)
            }

            kws.unshift(kw)
            store.setKw(kws)
            updateData.historyKws = kws
          }
  
          this.setData(updateData)
          resolve()
        }).catch(() => {
          this.setData({
            loading: 'apiFailed'
          })
          reject()
        })
      })
    },
    //查询海报
    queryPoster(left, right, params, ext) {
      return new Promise((resolve, reject) => {
        api.queryPoster(params, ext)
        .then((d) => {
          d.data.forEach((item) => {
            //填充图片尺寸
            item.imageUrl = util.imageResizer(item.imageUrl, '375', '750', 'm')

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
        wx.navigateTo({url: `/pages/poster/design/index?id=${evt.currentTarget.id}`})
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
      this.queryPoster(left, right, {
        kw: this.data.kw,
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
  }
})
