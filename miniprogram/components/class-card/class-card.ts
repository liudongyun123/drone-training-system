// components/class-card/class-card.ts
// 培训班卡片组件

Component({
  properties: {
    classInfo: {
      type: Object,
      value: {}
    },
    showActions: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onTap() {
      const classInfo = this.properties.classInfo
      if (classInfo && classInfo._id) {
        wx.navigateTo({
          url: `/pages/class-detail/class-detail?id=${classInfo._id}`
        })
      }
    },

    goToSchedule() {
      const classInfo = this.properties.classInfo
      if (classInfo && classInfo._id) {
        wx.navigateTo({
          url: `/pages/my-schedule/my-schedule?classId=${classInfo._id}`
        })
      }
    }
  }
})