import api from '../../../utils/api.js'
import util from '../../../utils/util.js'
const app = getApp()

Component({
  params: {}, //查询参数

  data: {
    //数据初始化加载状态
    //loading 加载中
    //success 成功
    //apiFailed API接口请求失败，可重试
    loading: 'loading',
    loadingRetry: false, //加载失败后，尝试重试获取数据时为TRUE
    attribute: {}, //分类属性
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
      return new Promise((resolve, reject) => {
        let failed = { loading: '' }
        let categories, currentCategory, attribute

        //获取分类
        api.getPosterCategories()
        .then((d) => {
          categories = d

          //分类属性
          currentCategory = categories.filter(k => k.id === this.params.categoryId)[0]
          attribute = (currentCategory.attributes || [])[0] || {id:'', records:[]}
          attribute.records.unshift({
            id: '',
            current: true,
            value: '全部'
          })

          if (this.params.attributeRecordId) {
            for (let item of attribute.records) {
              item.current = item.id === this.params.attributeRecordId
            }
          }

          //查询海报
          return this.queryPoster({
            categoryId: this.params.categoryId,
            attributeId: this.params.attributeId,
            attributeRecordId: this.params.attributeRecordId,
            page: {
              pageIndex: 1
            }
          })
        }, () => {
          failed.loading = failed.loading || 'apiFailed'
          return Promise.reject()
        })
        .then((d) => {
          wx.setNavigationBarTitle({title: currentCategory.name})

          //组装瀑布流数据
          let left = {height: 0, posters: []}
          let right = {height: 0, posters: []}
          d.data.forEach((item) => {
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

          this.setData({
            loading: 'success',
            loadingRetry: false,
            attribute: attribute,
            left: left,
            right: right,
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
    //查询海报
    queryPoster(params, ext) {
      return new Promise((resolve, reject) => {
        api.queryPoster(params, ext)
        .then((d) => {
          //填充图片尺寸
          d.data.forEach((poster) => {
            poster.imageUrl = util.imageResizer(poster.imageUrl, '375', '750', 'm')
          })

          resolve(d)
        })
        .catch(() => {
          reject()
        })
      })
    },
    //属性点击事件
    onClickTag(evt) {
      //当前属性
      let record
      for (let i in this.data.attribute.records) {
        let item = this.data.attribute.records[i]
        if (item.id === evt.currentTarget.id) {
          //已选中属性
          if (item.current) return

          record = item
          item.current = true
        } else {
          item.current = false
        }
      }

      this.queryPoster({
        categoryId: this.params.categoryId,
        attributeId: this.data.attribute.id,
        attributeRecordId: record.id,
        page: {
          pageIndex: 1
        }
      }, { 
        loading: true 
      })
      .then((d) => {
        wx.pageScrollTo({
          scrollTop: 0
        })
        
        //组装瀑布流数据
        let left = {height: 0, posters: []}
        let right = {height: 0, posters: []}
        d.data.forEach((item) => {
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
        
        this.setData({
          attribute: this.data.attribute,
          left: left,
          right: right,
          pager: {
            //页码
            start: 1,
            //加载状态
            //loading 加载中
            //success 成功
            //fail 失败
            loading: 'success',
            //是否还有下一页更多数据
            hasMore: d.page.totalPage > 1
          }
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

      //当前选中的属性
      let record = this.data.attribute.records.filter(k => k.current)[0] || {}

      this.queryPoster({
        categoryId: this.params.categoryId,
        attributeId: this.data.attribute.id,
        attributeRecordId: record.id,
        page: {
          pageIndex: this.data.pager.start
        }
      }).then((d) => {
        //组装瀑布流数据
        let left = this.data.left
        let right = this.data.right
        d.data.forEach((item) => {
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

        this.data.pager.loading = 'success'
        this.data.pager.hasMore = d.page.totalPage > this.data.pager.start

        this.setData({
          left: left,
          right: right,
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
