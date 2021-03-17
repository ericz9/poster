//获取"添加到我的小程序"的状态
const isCloseAddTips = () => {
  const addTips = wx.getStorageSync('addTips')
  return addTips && addTips === 1
}

//关闭“添加到我的小程序”的显示状态
const closeAddTips = () => {
  wx.setStorageSync('addTips', 1)
}

//获取历史搜索关键词
const getKw = () => {
  const kw = wx.getStorageSync('kw')
  return kw || []
}

//设置历史搜索关键词
const setKw = (kws, callback) => {
  //执行业务回调函数
  if (callback) {
    try {
      callback()
      //执行成功则设置本地缓存
      wx.setStorageSync('kw', kws)
    } catch(ex) {
      console.error(ex)
      throw ex
    }
  } else {
    //直接设置
    wx.setStorageSync('kw', kws)
  }
}

//清空历史搜索关键词
const clearKw = (callback) => {
  //执行业务回调函数
  if (callback) {
    try {
      callback()
      //执行成功则清除本地缓存
      wx.removeStorageSync('kw')
    } catch(ex) {
      console.error(ex)
      throw ex
    }
  } else {
    //直接清除
    wx.removeStorageSync('kw')
  }
}

//设置我的推荐人用户ID
const setRecommendUserId = (userId) => {
  userId && wx.setStorageSync('recommendUserId', userId)
}

module.exports = {
  //添加到我的小程序
  isCloseAddTips: isCloseAddTips,
  closeAddTips: closeAddTips,
  //历史搜索关键词
  getKw: getKw,
  setKw: setKw,
  clearKw: clearKw,
  //设置我的推荐人用户ID
  setRecommendUserId: setRecommendUserId
}