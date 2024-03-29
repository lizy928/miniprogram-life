let app = getApp();
Page({

    /**
     * 页面的初始数据
     */
    data: {
        showLoading: true, // 在未从服务器端获取到打卡圈子信息之前则显示加载动画&&空白页面
        visitedUserId: 0, // 被访问者的userId  也就是需要显示该用户的相关信息
        visitorUserId: 0, // 访问者的userId    即小程序当前使用者的userId
        isMyself: false, // 是否为本人访问自己的个人主页 即 visitedUserId == visitorUserId

        // 被查看主页的用户基本信息
        visitedUserInfo: {
        },

        userInfo:{}, // 当前小程序使用者信息，也就是主页访问者信息

        // TODO 默认个人背景图
        defaultBgImg: '',

        // 兴趣标签数据
        personalLabelLists: '',

        // 主页访客中最新的五个用户头像地址
        latestFiveUserAvatarList: '',

        // 所参加的打卡圈子列表数据
        joinInPunchCardProjectList: [
            
        ],

        // 打卡日记列表信息显示
        punchCardDiaryList: [
            
        ], // 从服务器获取的打卡日记数据集合
        diaryListPageNo: 1, // 当前已加载的页码
        diaryListDataNum: 2, // 每页显示的打卡日记条数
        showDiaryListLoading: true, // 控制页面初次加载时日记列表数据获取的加载动画
        emptyDiaryListNotice: false, // 控制还没有日记列表数据时的提示信息
        moreDiaryDataLoad: false, // 控制下拉加载更多打卡日记的加载动画
        notMoreDiaryData: false, // 打卡日记已全部加载

        // 记录当前播放音频的打卡日记的下标 -1代表所有的打卡日记都没有播放音频
        currPlayAudioDiaryItemIndex: -1,
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {

        let that = this;
        // 检测是自身访问或者他人访问我的主页 设置变量isMyself表示
        that.data.visitedUserId = parseInt(options.visitedUserId);
        that.data.visitorUserId = parseInt(app.globalData.userInfo.id);
        that.data.isMyself = that.data.visitorUserId === that.data.visitedUserId;
        console.log(that.data.isMyself);

        this.setData({
            isMyself: that.data.isMyself,
            userInfo: app.globalData.userInfo,
            //TODO 动态获取个人标签数据
            personalLabelLists:[
                '小学生','大学生','外语','阅读',
                '托福雅思','国学','亲子幼教',
                '考院','音乐','绘画','运动健身'
            ],
            // TODO 动态获取最新五个访客的头像地址
            latestFiveUserAvatarList: [
              app.globalData.userInfo.avatarUrl,
              app.globalData.userInfo.avatarUrl,
              app.globalData.userInfo.avatarUrl,
              app.globalData.userInfo.avatarUrl,
              app.globalData.userInfo.avatarUrl
            ]
        })

        // 关闭本页面右上角的转发按钮 想要转发只能通过button实现
        wx.hideShareMenu();
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {
        let that = this;

        wx.showLoading({
            title: '加载中...'
        });

        // 获取指定用户的获取详细的信息
        // 1.用户基本信息、5.访问者记录 TODO 2.个人主页背景图、3.粉丝、关注者情况、4.个人标签、
        wx.request({
            url: app.globalData.gateway + 'life-user/api/user/getUserDetailInfoById',
            method: 'get',
            data: {
                visitedId: that.data.visitedUserId,
                visitorId: that.data.visitorUserId
            },
            header: {
                token: app.globalData.token
            },
            success: function (res) {
                console.log(res);
                let data = res.data;
                switch (res.statusCode) {
                    case 200:
                        wx.hideLoading();
                        wx.setNavigationBarTitle({
                            title: data.data.nickName + '的个人主页'
                        });
                        that.setData({
                            showLoading: false,
                            visitedUserInfo: data.data,
                        });
                        break;
                    default:
                        wx.showToast({
                            title: data.msg,
                            icon: 'none',
                            duration: 2000
                        });
                        break;
                }
            },
            fail: function () {
                wx.showToast({
                    title: '网络异常',
                    icon: 'none',
                    duration: 2000
                });
            }
        });

        // 2.获取用户参与的打卡圈子
        // 自己查看自己的个人主页后端返回全部的打卡圈子列表
        // 其他用户查看则后端只返回公开类型的打卡圈子列表
        let getPunchCardProjectList = new Promise(function (resolve) {
            wx.request({
                url: app.globalData.gateway + 'life-user/api/userPunchCard/getUserPunchCardProjectListByType',
                method: 'get',
                data: {
                    userId: that.data.visitedUserId,
                    // 代表查询自己的打卡圈子列表 0则代表查看他人的
                    isDiaryCreator: that.data.isMyself === true ? 1 : 0
                },
                header: {
                    token: app.globalData.token
                },
                success: function (res) {
                    let respData = res.data;
                    console.log(respData);
                    switch (res.statusCode) {
                        case 200:
                            // 还没有加入任何打卡圈子或者没有可以显示的公开类型圈子列表
                            if (respData.data.length <= 0) {
                                resolve(true);
                            }

                            // 存在打卡圈子列表
                            let bgColor = [
                                '#73E68C', '#F48FB1', 'cornflowerblue', 'darkorange',
                                '#CE93D8', '#4FC3F7', '#ebff81', '#80D8FF'
                            ];
                            for (let i = 0; i < respData.data.length; i++) {
                                // 设置随机的打卡圈子选项卡背景颜色
                                respData.data[i].bg_color = bgColor[i % 7];
                                respData.data[i].rank = '暂无'; // TODO 排名后台暂时还没做
                            }
                            that.setData({
                                joinInPunchCardProjectList: respData.data
                            });
                            resolve(true);
                            break;

                        default:
                            resolve(false);
                            wx.showToast({
                                title: respData.msg,
                                icon: 'none',
                                duration: 2000
                            });
                            break;
                    }
                },
                fail: function () {
                    wx.showToast({
                        title: '网络异常,无法获取打卡圈子列表',
                        icon: 'none',
                        duration: 2000
                    });
                }
            })
        });

        // 3.用户的打卡圈子列表获取成功后 获取圈子的打卡日记列表
        // 自己查看自己的个人主页后端返回全部的圈子的全部打卡日记列表
        // 其他用户查看则后端只返回公开类型的打卡圈子下的打卡日记列表
        getPunchCardProjectList.then(function (res) {
            console.log(res);

            // 获取打卡圈子列表失败
            if (res === false) {
                // 不进行打卡日记的获取请求 && 关闭打卡日记的初次获取时的加载动画
                that.setData({
                    showDiaryListLoading: false
                });
                return false;
            }

            // 获取打卡圈子列表的请求成功
            if (res === true) {
                // 但该用户还没有或者没有可以显示的打卡圈子列表
                if (that.data.joinInPunchCardProjectList.length <= 0) {
                    // 不进行打卡日记的获取请求 && 并显示没有打卡日记列表数据提示信息
                    that.setData({
                        showDiaryListLoading: false,
                        emptyDiaryListNotice: true
                    });
                    return false;
                }

                // 若存在打卡圈子列表则获取对应的日记列表数据(第一页数据)
                that.getMyPunchCardDiaryList(1,that.data.diaryListDataNum,function (res) {
                    console.log(res);
                    let respData = res.data;
                    switch (res.statusCode) {
                        case 200:
                            that.data.punchCardDiaryList = []; // 清空列表
                            that.setData({
                                showDiaryListLoading: false,
                                punchCardDiaryList: respData.data,
                                diaryListPageNo: 1
                            });
                            break;

                        case 400:
                            // 我还没有打卡日记数据，显示打卡日记列表为空的提示信息
                            that.setData({
                                emptyDiaryListNotice: true,  // 显示打卡日记列表为空的提示信息
                                showDiaryListLoading: false, // 关闭初次获取打卡日记时的加载动画
                            });
                            break;

                        default:
                            wx.showToast({
                                title: respData.errMsg,
                                icon: 'none',
                                duration: 2000
                            });
                            break;
                    }
                });
            }
        });
    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function () {
        let that = this;
        that.getMyPunchCardDiaryList(1, that.data.diaryListDataNum, function (res) {

            wx.stopPullDownRefresh(); // 请求成功停止下拉刷新

            let respData = res.data;
            switch (res.statusCode) {
                case 200:
                    that.data.punchCardDiaryList = []; // 清空列表
                    that.setData({
                        showDiaryListLoading: false,
                        punchCardDiaryList: respData.data,
                        diaryListPageNo: 1,
                        notMoreDiaryData: false // 下拉刷新后需要重置打卡日记列表为未完全加载完毕状态
                    });

                    wx.showToast({
                        title: '获取新数据成功',
                        duration: 2000
                    });

                    break;

                case 400:
                    // 我还没有打卡日记数据，显示打卡日记列表为空的提示信息
                    that.setData({
                        emptyDiaryListNotice: true,
                        showDiaryListLoading: false,
                        notMoreDiaryData: false
                    });
                    break;

                default:
                    wx.showToast({
                        title: respData.errMsg,
                        icon: 'none',
                        duration: 2000
                    });
                    break;
            }
        });
    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {
        // 上拉加载下一页打卡日记数据
        let that = this,
            nextPageNo = that.data.diaryListPageNo + 1;

        // 打卡日记已经全部加载则不再发起请求
        if (that.data.notMoreDiaryData === true)
            return;

        that.setData({
            moreDiaryDataLoad: true, // 显示加载下一页打卡日记数据的动画
        });

        that.getMyPunchCardDiaryList(nextPageNo, that.data.diaryListDataNum, function (res) {
            let respData = res.data;
            switch (res.statusCode) {
                case 200:
                    let length = respData.data.length;
                    // 说明当前请求的页码没有数据，则上一页码已经是最后一页
                    if (length <= 0) {
                        that.setData({
                            notMoreDiaryData: true, // 设置打卡日记列表已经全部加载完毕
                            moreDiaryDataLoad: false, // 关闭加载动画
                            diaryListPageNo: nextPageNo - 1
                        });
                        console.log(that.data.diaryListPageNo);

                    } else {
                        // 将新数据追加入已获取的打卡日记列表集合中
                        for (let i = 0; i < length; i++) {
                            that.data.punchCardDiaryList[that.data.punchCardDiaryList.length] =
                                respData.data[i];
                        }

                        that.setData({
                            notMoreDiaryData: false, // 说明当前请求的页码还不是尾页，是否已完全加载完毕也未知
                            moreDiaryDataLoad: false, // 关闭加载动画
                            punchCardDiaryList: that.data.punchCardDiaryList,
                            diaryListPageNo: nextPageNo
                        });
                        console.log(that.data.diaryListPageNo);

                    }
                    break;

                default:
                    wx.showToast({
                        title: respData.errMsg,
                        icon: 'none',
                        duration: 2000
                    });
                    break;
            }
        });
    },

    /**
     * * 获取指定页码的打卡日记列表
     * @param pageNo 需要获取打卡日记列表的页码
     * @param dataNum 每页的打卡日记条数
     * @param callback 请求成功的回调处理函数
     */
    getMyPunchCardDiaryList: function(pageNo,dataNum,callback) {
        let that = this;
        wx.request({
          url: app.globalData.gateway + 'life-punch/api/punchCardDiary/listUserPunchCardDiary',
            method: 'get',
            data: {
                visitedUserId: that.data.visitedUserId, // 被查看打卡日记列表的用户的id
                visitorUserId: that.data.visitorUserId, // 查看者的id
                pageNo: parseInt(pageNo),
                dataNum: parseInt(dataNum),

                // 代表查询自己的打卡日记列表 0则代表查看他人的
                isDiaryCreator: that.data.isMyself === true ? 1 : 0,
            },
            header: {
                token: app.globalData.token
            },
            success: function (res) {
                // 请求成功执行回调函数进行对应的处理
                callback && callback(res);
            },
            fail: function () {
                wx.showToast({
                    title: '网络异常,无法获取打卡日记',
                    icon: 'none',
                    duration: 2000
                });
            }
        });
    },

    // 点击日记的分享按钮 分享打卡日记
    onShareAppMessage: function(options) {
        console.log(options);

        // 获取当前被分享的打卡日记相关数据
        let currDiary = options.target.dataset.diary;

        // 当前用户id
        let currUserId = parseInt(app.globalData.userInfo.id);
        // 与该打卡日记的用户id对比 检测当前用户是否为该日记的发表者
        let isDiaryPublisher = (currUserId === parseInt(currDiary.publisher.id));

        // 设置分享的标题
        let shareTitle = '';
        if (isDiaryPublisher) {
            // 分享的是自己的打卡日记
          shareTitle = '【' + app.globalData.userInfo.nickName + '】的打卡日记';
        } else {
          shareTitle = currDiary.publisher.nickName + '的打卡日记';
        }

        // 设置分享的图片的url
        let imgUrl = '';
        if (currDiary.diaryResource.length <= 0 || parseInt(currDiary.diaryResource[0].type) === 2) {
            // 资源列表为空或者资源列表第一个元素存放的不是图片（type=1）都说明该日记不存在图片资源
            //  分享一张已设置的图片
            imgUrl = 'http://upload.dliony.com/520d70c0a777ec055df58c3fed943b37.png';
        } else {
            // 存在图片资源 设置第一张图片为分享图片
            imgUrl = currDiary.diaryResource[0].resourceUrl;
        }
        console.log(imgUrl);

        return {
            title: shareTitle,
            path: '/pages/diaryDetailPage/index' + '?diaryId=' + currDiary.id,
            imageUrl: imgUrl
        };
    },

    // 进入打卡圈子的打卡详情页
    intoProjectDetailPage: function (e) {
        wx.navigateTo({
            url: '/pages/punchCardDetailPage/index'
                + "?projectId=" + e.currentTarget.dataset.projectId
                + "&isCreator=" + -1
        });
    },

    // 当音频组件的播放状态发生改变时，会触发父组件该方法
    // 父组件会重新更新一个用来标识是哪个打卡日记中的音频文件被播放的变量的值
    parentPageGetAudioPlayStatus: function (e) {
        // console.log('父级页面接收到音频组件播放状态改变通知:');
        // console.log(e);
        let diaryItemIndex = e.detail.diaryItemIndex,
            audioPlayStatus = e.detail.audioPlayStatus;
        console.log('音频播放状态发生改变，此时的状态是：' + audioPlayStatus);
        console.log('播放状态发生改变的音频所处的日记子项的index：' + diaryItemIndex);
        let that = this;

        if (audioPlayStatus === 'pause') {
            that.data.currPlayAudioDiaryItemIndex = -1;
        }

        if (audioPlayStatus === 'play') {
            that.data.currPlayAudioDiaryItemIndex = diaryItemIndex;
        }
        console.log('父页面参数currPlayAudioDiaryItemIndex = ' + that.data.currPlayAudioDiaryItemIndex);

        that.setData({
            currPlayAudioDiaryItemIndex: that.data.currPlayAudioDiaryItemIndex
        });
    }
});