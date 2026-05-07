/**
 * 修复首页配置 - 更新热门课程和热门班级的ID
 */
const cloudbase = require('tcb-admin-node');

cloudbase.init({
  env: 'rcwljy-5ghmq2ex26764978'
});

const db = cloudbase.database();

async function updateFeaturedCourses() {
  // 正确的课程ID（使用数据库中实际的ID）
  const correctCourseIds = [
    '98d3bbc169f4c25c00858e7126923354', // 无人机航拍进阶课程
    'ae0498ca69f4c25c0081596c2f51f2b5', // 植保无人机操作培训
    '399cd1a569f4c2610080937d35342599', // CAAC无人机驾驶员执照培训
    'e35392d069f4c261007e9aa3342e0710', // 无人机航拍进阶课程
  ];

  try {
    // 先获取现有配置
    const existing = await db.collection('featuredCourses').doc('home-featured').get();
    
    if (existing.data && existing.data.length > 0) {
      // 更新
      await db.collection('featuredCourses').doc('home-featured').update({
        data: {
          courseIds: correctCourseIds,
          updateTime: new Date().toISOString()
        }
      });
      console.log('✅ 热门课程配置已更新');
    } else {
      // 创建
      await db.collection('featuredCourses').add({
        data: {
          _id: 'home-featured',
          courseIds: correctCourseIds,
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString()
        }
      });
      console.log('✅ 热门课程配置已创建');
    }
  } catch (e) {
    console.error('更新热门课程失败:', e);
  }
}

async function updateFeaturedClasses() {
  // 正确的班级ID（status=enrolling 的班级）
  const correctClassIds = [
    '8e40b4e269f4c25d00816c430b856da4', // CAAC第12期培训班
    'ee33190469f4c25d0080d9634d1121d5', // 航拍技术周末班
    'ae0498ca69f4c261008159a308011a88', // CAAC第12期培训班
  ];

  try {
    const existing = await db.collection('featuredClasses').doc('home-featured-classes').get();
    
    if (existing.data && existing.data.length > 0) {
      await db.collection('featuredClasses').doc('home-featured-classes').update({
        data: {
          classIds: correctClassIds,
          updateTime: new Date().toISOString()
        }
      });
      console.log('✅ 热门班级配置已更新');
    } else {
      await db.collection('featuredClasses').add({
        data: {
          _id: 'home-featured-classes',
          classIds: correctClassIds,
          description: '首页展示班级配置',
          updateTime: new Date().toISOString()
        }
      });
      console.log('✅ 热门班级配置已创建');
    }
  } catch (e) {
    console.error('更新热门班级失败:', e);
  }
}

async function main() {
  console.log('开始更新首页配置...');
  await updateFeaturedCourses();
  await updateFeaturedClasses();
  console.log('完成!');
}

main().catch(console.error);
