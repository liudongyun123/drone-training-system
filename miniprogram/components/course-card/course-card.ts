// components/course-card/course-card.ts
// 课程卡片组件

Component({
  properties: {
    course: {
      type: Object,
      value: {}
    },
    showProgress: {
      type: Boolean,
      value: false
    }
  },

  data: {
    defaultCover: '/assets/default-cover.png'
  },

  methods: {
    onTap() {
      const course = this.properties.course
      if (course && course._id) {
        wx.navigateTo({
          url: `/pages/course-detail/course-detail?id=${course._id}`
        })
      }
    }
  }
})