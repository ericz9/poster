import api from '../../utils/api.js'
import util from '../../utils/util.js'
import store from '../../utils/store.js'
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
    ads: [], //广告
    categories: [], //分类
  },
  methods: {
    onLoad(params) {
      this.params = params
      store.setRecommendUserId((params || {}).recommendUserId)
    },
    onShow() {
      if (this.data.categories.length <= 0) {
        if (app.globalData.whoami) {
          this.initialize()
        } else {
          app.launchCallback = () => {
            this.initialize()
          }
        }
      }
    },
    //初始化
    initialize() {
      return new Promise((resolve, reject) => {
        let failed = { loading: '' }
        let ads, categories

        //获取广告
        api.getAds()
        .then((d) => {
          ads = d

          //获取分类
          return api.getPosterCategories()
        }, () => {
          failed.loading = failed.loading || 'apiFailed'
          return Promise.reject()
        })
        .then((d) => {
          categories = d

          //获取首页精选海报
          return api.getPosterTop()
        }, () => {
          failed.loading = failed.loading || 'apiFailed'
          return Promise.reject()
        })
        .then((d) => {
          //填充图片尺寸
          ads.forEach((item) => {
            item.imageUrl = util.imageResizer(item.imageUrl, '750', '350', 'c')
          })

          //分类数据填充、初始化精选海报
          categories.forEach((item) => {
            item.name = item.name.substring(0, 4)
            item.iconUrl = util.imageResizer(item.iconUrl, '100', '100', 'c')

            //分类没有属性时，默认初始化一个
            if (!item.attributes) {
              item.attribute = {
                id: '',
                name: '',
                records: []
              }
            } else {
              //只显示一个属性
              item.attribute = item.attributes[0]
              delete item.attributes
            }

            //每个属性都有自己的海报字段
            item.attribute.records.forEach((record) => {
              record.posters = []
            })

            //精选海报
            let posters = (d.filter(k => k.id === item.id)[0] || {}).posters || []
            posters.forEach((poster) => {
              poster.imageUrl = util.imageResizer(poster.imageUrl, '250', '500', 'm')
            })

            //手动添加精选类目
            item.attribute.records.unshift({
              id: '',
              value: '精选',
              current: true,
              posters: posters
            })
            item.posters = posters
            item.currentName = item.name
          })

          this.setData({
            loading: 'success',
            loadingRetry: false,
            ads: ads,
            categories: categories
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
    //搜索点击事件
    onClickSearch() {
      wx.navigateTo({url: '/pages/poster/search/index'})
    },
    //属性点击事件
    onClickAttribute(evt) {
      //当前分类
      let category, categoryIndex
      for (let i in this.data.categories) {
        let item = this.data.categories[i]
        if (item.id === evt.currentTarget.dataset.categoryId) {
          category = item
          categoryIndex = i
          break
        }
      }

      //当前属性
      let record
      for (let i in category.attribute.records) {
        let item = category.attribute.records[i]
        if (item.id === evt.currentTarget.id) {
          //已选中属性
          if (item.current) return

          item.current = true
          record = item
        } else {
          item.current = false
        }
      }

      const currentName = record.id ? record.value : category.name

      if (record.posters.length > 0) {
        this.setData({
          ['categories[' + categoryIndex + '].attribute.records']: category.attribute.records,
          ['categories[' + categoryIndex + '].posters']: record.posters,
          ['categories[' + categoryIndex + '].currentName']: currentName
        })
      } else {
        api.getPostersByAttribute({
          attributeId: category.attribute.id,
          attributeRecordId: record.id
        }, { 
          loading: true 
        })
        .then((d) => {
          //填充图片尺寸
          d.forEach((poster) => {
            poster.imageUrl = util.imageResizer(poster.imageUrl, '250', '500', 'm')
          })

          record.posters = d
          this.setData({
            ['categories[' + categoryIndex + '].attribute.records']: category.attribute.records,
            ['categories[' + categoryIndex + '].posters']: d,
            ['categories[' + categoryIndex + '].currentName']: currentName
          })
        })
      }
    },
    //点击海报
    onClickPoster(evt) {
      util.login()
      .then(() => {
        wx.navigateTo({url: `/pages/poster/design/index?id=${evt.currentTarget.id}`})
      })
    },
    //点击分类
    onClickCategory(evt) {
      wx.navigateTo({url: `/pages/poster/list/index?categoryId=${evt.currentTarget.id}`})
    },
    //点击分类底部更多
    onClickBottomMore(evt) {
      const category = this.data.categories.filter(k => k.id === evt.currentTarget.id)[0]
      const attributeId = category.attribute.id
      const attributeRecordId = (category.attribute.records.filter(k => k.current)[0] || {}).id

      wx.navigateTo({url: `/pages/poster/list/index?categoryId=${category.id}&attributeId=${attributeId}&attributeRecordId=${attributeRecordId}`})
    },
    //监听分享事件
    onShareAppMessage(res) {
      return {
        title: app.globalData.whoami.config.shareTitle,
        path: `/pages/home/index?recommendUserId=${app.globalData.whoami.user.id}`,
        imageUrl: util.env().fileServerUrl + app.globalData.whoami.config.shareImage
      }
    }
  }
})
