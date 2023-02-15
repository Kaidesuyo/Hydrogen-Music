<script setup>
  import { ref, computed, onActivated, watchEffect } from 'vue'
  import { onBeforeRouteLeave, onBeforeRouteUpdate, useRouter } from 'vue-router';
  import { isLogin } from '../utils/authority' 
  import { noticeOpen } from '../utils/dialog';
  import { subPlaylist } from '../api/playlist';
  import { subAlbum } from '../api/album'
  import { subArtist } from '../api/artist';
  import dayjs from 'dayjs'
  import { playAll } from '../utils/player';
  import LibrarySongList from './LibrarySongList.vue';
  import LibraryAlbumList from './LibraryAlbumList.vue';
  import LibraryMVList from '../components/LibraryMVList.vue'
  import { usePlayerStore } from '../store/playerStore';
  import { useLibraryStore } from '../store/libraryStore'
  import { useLocalStore } from '../store/localStore'
  import { storeToRefs } from 'pinia'

  const playerStore = usePlayerStore()
  const localStore = useLocalStore()
  const libraryStore = useLibraryStore()
  const { updateLibraryDetail, updateArtistTopSong, updateArtistAlbum, updateArtistsMV } = libraryStore
  const { libraryList, libraryInfo, librarySongs ,libraryAlbum ,libraryMV, playlistUserCreated, artistPageType, listType1, listType2, needTimestamp } = storeToRefs(libraryStore)

  const router = useRouter()
  const isAlbum = ref(false)
  const isSinger = ref(false)
  const isSongList = ref(false)
  const introduceDetailShow = ref(false)
  const introduceDetailShowDelay = ref(false)

  watchEffect(() => {
    if (introduceDetailShow.value) {
      setTimeout(() => {
        introduceDetailShowDelay.value = true
      }, 600);
    } else {
      introduceDetailShowDelay.value = false
    }
  })
  libraryTypeCheck(router.currentRoute.value.name)

  onBeforeRouteLeave((to, from, next) => {
    if(to.name == 'mymusic') {
      if(!isLogin()) router.push('/login')
      libraryInfo.value = null
    }
    libraryTypeCheck(to.name)
    next()
    document.getElementById('libraryScroll').scrollTop = 0
  })

  onBeforeRouteUpdate( async (to, from, next) => {
    await updateLibraryDetail(to.params.id, to.name)
    libraryTypeCheck(to.name)
    artistPageType.value = 0
    libraryAlbum.value = null
    libraryMV.value = null
    next()
    document.getElementById('libraryScroll').scrollTop = 0
  })

  const routerChange = (operation) => {
      if(operation) router.forward()
      else router.back()
  }

  function libraryTypeCheck(pageName) {
    isAlbum.value = false
    isSinger.value = false
    isSongList.value = false
    if(pageName == 'playlist' || pageName == '~playlist') {
      isSongList.value = true
    } else if (pageName == 'album' || pageName == '~album') {
      isSongList.value = true
      isAlbum.value = true
    } else if (pageName == 'artist' || pageName == '~artist') {
      isSinger.value = true
      if(artistPageType.value == 0) isSongList.value = true
    }
  }

  //计算歌单总时长(分)
  const totalTime = computed(() => {
    let total = 0
    const songList = librarySongs.value
    songList.forEach(song => {
      total += song.dt
    });
    return Math.round((total/1000)/60)
  })

  //歌单日期
  const createTime = computed(() => {
    return dayjs(libraryInfo.value.createTime || libraryInfo.value.publishTime).format("YYYY-MM-DD")
  })

  //如果是歌手页面，可以更换下面的类型
  const changeType = (type) => {
    if(type == 0) {
      isSongList.value = true
      updateArtistTopSong(libraryInfo.value.id)
    }
    if(type == 1) {
      isSongList.value = false
      updateArtistAlbum(libraryInfo.value.id)
    }
    if(type == 2) {
      isSongList.value = false
      updateArtistsMV(libraryInfo.value.id)
    }
    artistPageType.value = type
  }

  //歌单、专辑、歌手的收藏(极其降智的写法,主要问题是接口缓存的问题,使用时间戳请求数据后他不会自己更新最新缓存，所以设置了2分钟的无缓存时间)
  const subHandle = (id) => {
    let type1 = null
    let type2 = null
    if(!isAlbum.value && !isSinger.value) {
      type1 = 0,type2 = 1
    }
    if(isAlbum.value) {
      needTimestamp.value.push('/album/sublist')
      type1 = 1,type2 = 0
      let noCacheTimer = null
      if(noCacheTimer) clearTimeout(noCacheTimer)
      noCacheTimer = setTimeout(() => {
        needTimestamp.value.splice(needTimestamp.value.indexOf('/album/sublist'), 1)
        clearTimeout(noCacheTimer)
      }, 130000);
    }
    if(isSinger.value) {
      type1 = 1,type2 = 1
      needTimestamp.value.push('/artist/sublist')
      let noCacheTimer = null
      if(noCacheTimer) clearTimeout(noCacheTimer)
      noCacheTimer = setTimeout(() => {
        needTimestamp.value.splice(needTimestamp.value.indexOf('/artist/sublist'), 1)
        clearTimeout(noCacheTimer)
      }, 130000);
    }
    
    if(libraryInfo.value.followed) {
      libraryInfo.value.followed = false
      if(listType1.value == type1 && listType2.value == type2) libraryList.value.splice((libraryList.value || []).findIndex((item) => item.id === id), 1)
      return
    }
    if(!libraryInfo.value.followed) {
      libraryInfo.value.followed = true
      if(listType1.value == type1 && listType2.value == type2) libraryList.value.unshift(libraryInfo.value)
      return
    }
  }

  const librarySub = (id) => {
    let params = {
      id: id,
      t: (libraryInfo.value.followed ? 0 : 1),
      timestamp: new Date().getTime(),
    }
    if(isSinger.value) {
      subArtist(params).then(result => {
        if(result.code == 200) {
          subHandle(id)
          if(params.t == 1) noticeOpen("收藏成功", 2)
          else noticeOpen("已取消收藏", 2)
        } else {
          noticeOpen("收藏/取消收藏失败", 2)
        }
      })
    }
    if(isAlbum.value) {
      subAlbum(params).then(result => {
        if(result.code == 200) {
          subHandle(id)
          if(params.t == 1) noticeOpen("收藏成功", 2)
          else noticeOpen("已取消收藏", 2)
        } else {
          noticeOpen("收藏/取消收藏失败", 2)
        }
      })
    }
    if(!isAlbum.value && !isSinger.value) {
      let params = {
        id: id,
        t: (libraryInfo.value.followed ? 2 : 1),
        timestamp: new Date().getTime(),
      }
      subPlaylist(params).then(result => {
        console.log(id)
        console.log(result)
        if(result.code == 200) {
          subHandle(id)
          if(params.t == 1) noticeOpen("收藏成功", 2)
          else noticeOpen("已取消收藏", 2)
        } else {
          noticeOpen("收藏/取消收藏失败", 2)
        }
      })
    }
  }

  //查看并跳转歌手页面
  const checkArtist = (artistId) => {
    router.push('/mymusic/artist/' + artistId)
    playerStore.forbidLastRouter = true
  }
  //下载本歌单/专辑全部歌曲
  const downloadAll = () => {
    localStore.updateDownloadList(librarySongs.value)
  }
</script>

<template>
  <div class="library-detail" v-if="libraryInfo">
    <div class="view-control">
      <svg t="1669039513804" @click="routerChange(0)" class="router-last" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1053" width="200" height="200"><path d="M716.608 1010.112L218.88 512.384 717.376 13.888l45.248 45.248-453.248 453.248 452.48 452.48z" p-id="1054"></path></svg>
      <svg t="1669039531646" @click="routerChange(1)" class="router-next" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1207" width="200" height="200"><path d="M264.896 1010.112l497.728-497.728L264.128 13.888 218.88 59.136l453.248 453.248-452.48 452.48z" p-id="1208"></path></svg>
    </div>
    <div class="library-introduce">
      <div class="introduce">
        <div class="introduce-img" :class="{'introduce-img-circle': isSinger}">
          <img :src="(libraryInfo.coverImgUrl || libraryInfo.blurPicUrl || libraryInfo.img1v1Url) + '?param=300y300'" alt="">
        </div>
        <div class="introduce-info">
          <span class="introduce-name">{{libraryInfo.name}}</span>
          <div class="info-other">
            <div class="introduce-author">
              <span class="author" v-if="libraryInfo.creator">{{libraryInfo.creator.nickname}}</span>
              <span class="author" @click="checkArtist(artist.id)" v-for="(artist, index) in libraryInfo.artists">{{artist.name}}{{index == libraryInfo.artists.length -1 ? '' : '/'}}</span>
              <span class="author" v-if="libraryInfo.trans">{{libraryInfo.trans}}&nbsp;&nbsp;</span>
              <span class="author" v-for="(alia, index) in libraryInfo.alias">{{alia}}{{index == libraryInfo.alias.length -1 ? '' : ' · '}}</span>
            </div>
            <span class="introduce-num" v-if="!isSinger">共{{(libraryInfo.trackCount || libraryInfo.size)}}首 - {{totalTime}}分钟</span>
            <span class="introduce-num" v-if="isSinger">{{libraryInfo.musicSize}}首歌 · {{libraryInfo.albumSize}}张专辑 · {{libraryInfo.mvSize}}个MV</span>
            <div class="library-operation" v-if="isLogin()">
              <div class="operation-collection" v-show="(playlistUserCreated || []).findIndex((song) => song.id == libraryInfo.id) == -1" @click="librarySub(libraryInfo.id)">
                <svg v-show="!libraryInfo.followed" t="1669112450805" class="collect-icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2261" width="200" height="200"><path d="M98 480.86h829.99v63.79H98z" p-id="2262"></path><path d="M481.48 98.15h63.79V927h-63.79z" p-id="2263"></path></svg>
                <svg v-show="libraryInfo.followed" t="1670744716630" class="collected-icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2167" width="200" height="200"><path d="M392.533333 806.4L85.333333 503.466667l59.733334-59.733334 247.466666 247.466667L866.133333 213.333333l59.733334 59.733334L392.533333 806.4z" fill="#444444" p-id="2168"></path></svg>
                <span>{{libraryInfo.followed ? '已收藏' : '收藏'}}</span>
              </div>
              <div class="operation-download" v-if="!isSinger">
                <svg t="1669030443895" class="download-icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="10347" width="200" height="200" data-v-7f63928d=""><path d="M921.6 563.2c-9.6-9.6-25.6-9.6-35.2 0L544 896l0-822.4c0-12.8-9.6-22.4-25.6-22.4s-25.6 9.6-25.6 22.4L492.8 896l-342.4-339.2c-9.6-9.6-25.6-9.6-35.2 0-9.6 9.6-9.6 22.4 0 32l384 377.6c6.4 6.4 12.8 6.4 19.2 6.4 0 0 0 0 0 0 3.2 0 3.2 0 6.4 0 0 0 0 0 3.2 0 3.2 0 6.4-3.2 9.6-6.4l380.8-371.2C931.2 588.8 931.2 572.8 921.6 563.2z" p-id="10348" data-v-7f63928d=""></path></svg>
                <span @click="downloadAll()">下载</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="introduce-other">
        <div class="introduce-1" v-show="!isSinger">{{isAlbum ? '发行时间':'创建时间'}} {{createTime}}</div>
        <div class="introduce-1" v-if="libraryInfo.follow">{{libraryInfo.follow.fansCnt}} 已关注</div>
        <div class="introduce-2" @click="introduceDetailShow = !introduceDetailShow">查看详情</div>
      </div>
      <transition name="metro">
        <div class="introduce-detail-text" :class="{'introduce-detail-text-active':introduceDetailShowDelay}" v-if="introduceDetailShow">
          <div class="detail-text">
            <p class="text">{{libraryInfo.description || libraryInfo.briefDesc || "暂无描述"}}</p>
          </div>
          <div class="text-close" @click="introduceDetailShow = false">
            <svg t="1671966797621" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1965" width="200" height="200"><path d="M576 512l277.333333 277.333333-64 64-277.333333-277.333333L234.666667 853.333333 170.666667 789.333333l277.333333-277.333333L170.666667 234.666667 234.666667 170.666667l277.333333 277.333333L789.333333 170.666667 853.333333 234.666667 576 512z" fill="#ffffff" p-id="1966"></path></svg>
          </div>
          <span class="dialog-style dialog-style1"></span>
          <span class="dialog-style dialog-style2"></span>
          <span class="dialog-style dialog-style3"></span>
          <span class="dialog-style dialog-style4"></span>
        </div>
      </transition>
    </div>

    <div class="library-option">
      <div class="library-type" v-if="isSinger">
        <span :class="{'type-selected': artistPageType == 0}" @click="changeType(0)">热门单曲</span>
        <span :class="{'type-selected': artistPageType == 1}" @click="changeType(1)">专辑</span>
        <span :class="{'type-selected': artistPageType == 2}" @click="changeType(2)">MV</span>
      </div>
      <div class="library-playall" v-show="isSongList || (isSinger && artistPageType == 0)">
        <div class="playall">
          <svg t="1668421583939" class="playall-icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6964" width="200" height="200" data-v-ef3af43f=""><path d="M864.5 516.2c-2.4-4.1-6.2-6.9-10.4-8.3L286.4 159c-8.9-5-20.3-2-25.5 6.6-2.1 3.6-2.8 7.5-2.3 11.3v697.5c-0.5 3.8 0.2 7.8 2.3 11.3 5.2 8.7 16.6 11.6 25.5 6.6l567.7-349c4.2-1.3 8-4.2 10.4-8.3 1.7-3 2.5-6.3 2.4-9.5 0.1-3-0.7-6.3-2.4-9.3z m-569-308.8l517.6 318.3L295.5 844V207.4z" p-id="6965" data-v-ef3af43f=""></path></svg>
          <span @click="playAll('other', librarySongs)">播放全部</span>
        </div>
        <div class="playall-line"></div>
        <span @click="playAll('other', librarySongs)" class="playall-en">PLAYALL</span>
      </div>
    </div>

    <LibrarySongList :songlist="librarySongs" class="library-content" :class="{'library-content2': artistPageType == 0 && isSinger}" v-show="artistPageType == 0"></LibrarySongList>
    <LibraryAlbumList :albumlist="libraryAlbum" class="library-content3" v-show="artistPageType == 1"></LibraryAlbumList>
    <LibraryMVList  :mvlist="libraryMV" class="library-content3" v-show="artistPageType == 2"></LibraryMVList>
  </div>
</template>

<style scoped lang="scss">
  .library-detail{
    width: 100%;
    height: calc(100% - 22Px);
    .view-control{
      margin-left: -8Px;
      height: 32Px;
      svg{
        padding: 8Px;
        width: 32Px;
        height: 32Px;
        float: left;
        transition: 0.2s;
        &:hover{
          cursor: pointer;
          opacity: 0.7;
        }
        &:active{
          transform: scale(0.9);
        }
      }
      .router-last{
        margin-right: 20Px;
      }
    }
    .library-introduce{
      width: 100%;
      display: flex;
      position: relative;
      justify-content: space-between;
      .introduce{
        width: calc(100% - 130Px);
        display: flex;
        flex-direction: row;
        .introduce-img{
          margin-right: 10Px;
          border: 0.5Px solid rgb(218, 218, 218);
          box-shadow: 0 0 6Px 1Px rgba(0, 0, 0, 0.03);
          // padding: 2Px;
          width: 150Px;
          height: 150Px;
          img{
            width: 100%;
            height: 100%;
          }
        }
        .introduce-img-circle{
          border-radius: 50%;
          img{
            width: 100%;
            height: 100%;
            border-radius: 50%;
          }
        }
        .introduce-info{
          width: calc(100% - 160Px);
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          align-items: flex-start;
          text-align: left;
          user-select: text;
          .introduce-name{
            width: 90%;
            font:  22Px Source Han Sans;
            font-weight: bold;
            color: black;
            overflow: hidden;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            word-break: break-all;
          }
          .info-other{
            display: flex;
            flex-direction: column;
            span{
              font: 11Px SourceHanSansCN-Bold;
            }
            .introduce-author{
              width: 100%;
              font-size: 12Px;
              color: black;
              transition: 0.2s;
              overflow: hidden;
              display: -webkit-box;
              -webkit-box-orient: vertical;
              -webkit-line-clamp: 1;
              word-break: break-all;
              &:hover{
                cursor: pointer;
                opacity: 0.7;
              }
            }
            .introduce-num{
              color: rgb(122, 122, 122);
            }
            .library-operation{
              margin-top: 10Px;
              display: flex;
              flex-direction: row;
              div{
                margin-right: 20Px;
                display: flex;
                flex-direction: row;
                align-items: center;
                transition: 0.2s;
                &:hover{
                  cursor: pointer;
                  opacity: 0.6;
                }
                svg{
                  width: 16Px;
                  height: 16Px;
                }
                span{
                  margin-left: 5Px;
                  font-size: 15Px;
                  color: black;
                }
              }
            }
          }
        }
      }
      .introduce-other{
        width: 130Px;
        div{
          width: 100%;
          height: 16Px;
        }
        .introduce-1{
          border: 1Px solid black;
          font: 10Px SourceHanSansCN-Bold;
          color: black;
        }
        .introduce-2{
          margin-top: 6Px;
          background-color: black;
          font: 10Px SourceHanSansCN-Bold;
          color: rgb(207, 226, 231);
          transition: 0.2s;
          &:hover{
            cursor: pointer;
            background-color: rgb(61, 61, 61);
          }
        }
      }
      .introduce-detail-text{
        width: 0;
        height: 0;
        background-color: rgba(0, 0, 0, 0.9);
        position: fixed;
        z-index: 998;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        &-active {
          width: 700Px;height: 400Px;padding: 30PX 60Px;
        }
        .detail-text{
          width: 100%;
          height: 100%;
          overflow: auto;
          &::-webkit-scrollbar{
            display: none;
          }
          .text{
            margin: 0;
            font: 14Px Source Han Sans;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
            text-align: left;
            text-indent: 2em;
          }
        }
        .text-close{
          width: 25Px;
          height: 25Px;
          position: absolute;
          top: 15Px;
          right: 15Px;
          opacity: 0;
          animation: text-close 0.1s 0.6s forwards;
          @keyframes text-close {
            0%{opacity: 0;}
            100%{opacity: 1;}
          }
          &:hover{
            cursor: pointer;
            opacity: 0.8 !important;
          }
          svg{
            width: 100%;
            height: 100%;
          }
        }
        .dialog-style{
          width: 9Px;
          height: 9Px;
          background-color: rgb(247, 247, 247);
          position: absolute;
          opacity: 0;
          animation: dialog-style-in 0.4s forwards;
          @keyframes dialog-style-in {
            0%{opacity: 0;}
            10%{opacity: 1;}
            20%{opacity: 0;}
            30%{opacity: 1;}
            40%{opacity: 0;}
            50%{opacity: 1;}
            60%{opacity: 0;}
            70%{opacity: 1;}
            80%{opacity: 0;}
            90%{opacity: 0;}
            100%{opacity: 1;}
          }
        }
        $position: -4Px;
        .dialog-style1{
          top: $position;
          left: $position;
        }
        .dialog-style2{
          top: $position;
          right: $position;
        }
        .dialog-style3{
          bottom: $position;
          right: $position;
        }
        .dialog-style4{
          bottom: $position;
          left: $position;
        }
      }
    }
    .library-option{
      margin-top: 15Px;
      padding: 0 4Px;
      .library-type{
        display: flex;
        flex-direction: row;
        span{
          margin-right: 25Px;
          font: 15Px SourceHanSansCN-Bold;
          color: rgb(78, 78, 78);
          transition: 0.2s;
          &:hover{
            cursor: pointer;
            color: black;
          }
        }
        .type-selected{
          color: black;
        }
      }
      .library-playall{
        margin: 10Px 0;
        display: flex;
        flex-direction: row;
        align-items: center;
        .playall{
          display: flex;
          flex-direction: row;
          align-items: center;
          transition: 0.2s;
          &:hover{
            cursor: pointer;
            opacity: 0.6;
          }
          svg{
            width: 17Px;
            height: 17Px;
          }
          span{
            margin: 0 5Px;
            font: 12Px SourceHanSansCN-Bold;
            color: black;
            white-space: nowrap;
          }
        }
        .playall-line{
          width: 100%;
          height: 0.5Px;
          background-color: rgb(154, 154, 154);
        }
        .playall-en{
          margin-left: 4Px;
          font: 8Px Geometos;
          color: rgb(154, 154, 154);
          transition: 0.2s;
          &:hover{
            cursor: pointer;
            color: black;
          }
        }
      }
    }
    .library-content{
      height: calc(100% - 203Px);
      overflow: auto;
      &::-webkit-scrollbar{
        display: none;
      }
    }
    .library-content2{
      height: calc(100% - 236Px);
    }
    .library-content3{
      height: calc(100% - 198Px);
    }
  }
</style>

<style lang="scss">

.metro-enter-active {
  animation: introduce-detail-in 0.6s 0.3s forwards;
}
.metro-leave-active {
  animation: introduce-detail-in 0.6s 0.1s reverse;
  .text-close {
    display: none;
  }
}
@keyframes introduce-detail-in {
  0%{width: 0;height: 0;padding: 0;}
  50%{width: 700Px;height: 0;padding: 0 60Px;}
  100%{width: 700Px;height: 400Px;padding: 30PX 60Px;}
}

</style>