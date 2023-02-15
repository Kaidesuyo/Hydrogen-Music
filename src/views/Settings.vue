<script setup>
  import { ref, onActivated } from 'vue'
  import { onBeforeRouteLeave, useRouter } from 'vue-router';
  import { logout } from '../api/user'
  import { noticeOpen, dialogOpen } from "../utils/dialog";
  import { initSettings } from '../utils/initApp';
  import { getVipInfo} from '../api/user'
  import { isLogin } from '../utils/authority';
  import { useUserStore } from '../store/userStore';
  import { usePlayerStore } from '../store/playerStore';
  import ASelect, { SelectOption} from 'ant-design-vue/lib/select'
  import 'ant-design-vue/lib/select/style/css'

  const router = useRouter()
  const userStore = useUserStore()
  const playerStore = usePlayerStore()

  const vipInfo = ref(null)
  const musicLevel = ref('standard')
  const lyricSize = ref(20)
  const tlyricSize = ref(13)
  const rlyricSize = ref(12)
  const lyricInterlude = ref(13)
  const globalShortcuts = ref(false)
  const quitApp = ref('minimize')
  const downloadFolder = ref(null)
  const videoFolder = ref(null)
  const localFolder = ref([])
  const shortcutsList = ref(null)
  const selectedShortcut = ref(null)
  const newShortcut = ref([])
  const shortcutCharacter  = ['=', '-', '~', '@', '#', '$', '[', ']', ';', "'", ',', '.', '/', '!'];

  if(isLogin()) {
    getVipInfo().then(result => {
        vipInfo.value = result.data
    })
  }
  onActivated(() => {
    windowApi.getSettings().then(settings => {
        if(!settings) return
        musicLevel.value = settings.music.level
        lyricSize.value = settings.music.lyricSize
        tlyricSize.value = settings.music.tlyricSize
        rlyricSize.value = settings.music.rlyricSize
        lyricInterlude.value = settings.music.lyricInterlude
        videoFolder.value = settings.local.videoFolder
        downloadFolder.value = settings.local.downloadFolder
        localFolder.value = settings.local.localFolder
        shortcutsList.value = settings.shortcuts
        globalShortcuts.value = settings.other.globalShortcuts
        quitApp.value = settings.other.quitApp
    })
  })

  const setAppSettings = () => {
    let settings = {
        music: {
            level: musicLevel.value,
            lyricSize: lyricSize.value,
            tlyricSize: tlyricSize.value,
            rlyricSize: rlyricSize.value,
            lyricInterlude: lyricInterlude.value
        },
        local: {
            videoFolder: videoFolder.value,
            downloadFolder: downloadFolder.value,
            localFolder: localFolder.value
        },
        shortcuts: shortcutsList.value,
        other: {
            globalShortcuts: globalShortcuts.value,
            quitApp: quitApp.value
        }
    }
    windowApi.setSettings(JSON.stringify(settings))
  }

  onBeforeRouteLeave((to, from, next) => {
    setAppSettings()
    initSettings()
    next()
    noticeOpen("设置已保存", 2)
  })

  const routerChange = () => {
    router.back()
  }

  const selectFolder = (type) => {
    if(type == 'download') {
        windowApi.openFile().then(path => {
            downloadFolder.value = path
        })
    } else if(type == 'local') {
        windowApi.openFile().then(path => {
            if(path && localFolder.value.indexOf(path) == -1) localFolder.value.push(path)
        })
    } else if(type == 'video') {
        windowApi.openFile().then(path => {
            videoFolder.value = path
        })
    }
  }
  const deleteLocalFolder = (index) => {
    localFolder.value.splice(index, 1)
  }

  const formatShortcutName = (name) => {
      return name.replaceAll('+', ' + ').replace('Up', '↑').replace('Down', '↓').replace('Right', '→').replace('Left', '←').replace('Space', '空格').replace('Numpad', '').replace('num', '').replace('CommandOrControl', 'Ctrl').replace('Control', 'Ctrl');
  }
  const changeShortcut = (id, type) => {
    selectedShortcut.value = {
        id: id,
        type: type
    }
    windowApi.unregisterShortcuts()
  }
  /**
   * author: yesplaymusic
   */
  const updateShortcut = () => {
    let shortcut = [];
    newShortcut.value.map(e => {
        if (e.keyCode >= 65 && e.keyCode <= 90) {
            shortcut.push(e.code.replace('Key', ''));
        } else if (['Control', 'Shift', 'Alt'].includes(e.key)) {
            shortcut.push(e.key);
        } else if (e.keyCode >= 48 && e.keyCode <= 57) {
            shortcut.push(e.code.replace('Digit', ''));
        } else if (e.keyCode >= 96 && e.keyCode <= 105) {
            shortcut.push(e.code.replace('Numpad', 'num'));
        } else if (e.keyCode >= 112 && e.keyCode <= 123) {
            shortcut.push(e.code);
        } else if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            shortcut.push(e.code.replace('Arrow', ''));
        } else if (shortcutCharacter.includes(e.key)) {
            shortcut.push(e.key);
        }
    });
    const sortTable = {
        Control: 1,
        Shift: 2,
        Alt: 3
    };
    shortcut = shortcut.sort((a, b) => {
    if (!sortTable[a] || !sortTable[b]) return 0;
    if (sortTable[a] - sortTable[b] <= -1) {
        return -1;
    } else if (sortTable[a] - sortTable[b] >= 1) {
        return 1;
    } else {
        return 0;
    }
    });
    shortcut = shortcut.join('+');
    return shortcut;
  }
  const inputShortcut = (k) => {
    if(!selectedShortcut.value) return
    if (newShortcut.value.find(nk => nk.keyCode === k.keyCode)) return;
    else newShortcut.value.push(k)
    if ((k.keyCode >= 65 && k.keyCode <= 90) || (k.keyCode >= 48 && k.keyCode <= 57) || (k.keyCode >= 96 && k.keyCode <= 105) || (k.keyCode >= 112 && k.keyCode <= 123) || ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(k.key) || shortcutCharacter.includes(k.key)) {
        if(selectedShortcut.value.type) shortcutsList.value.find(sc => (sc.id == selectedShortcut.value.id)).globalShortcut = updateShortcut()
        else shortcutsList.value.find(sc => (sc.id == selectedShortcut.value.id)).shortcut = updateShortcut()
        newShortcut.value = []
    }
  }
  const setDefaultShortcuts = () => {
      shortcutsList.value = [{id: 'play',name: '播放/暂停',shortcut: 'CommandOrControl+P',globalShortcut: 'CommandOrControl+Alt+P',},{id: 'last',name: '上一首',shortcut: 'CommandOrControl+Left',globalShortcut: 'CommandOrControl+Alt+Left',},{id: 'next',name: '下一首',shortcut: 'CommandOrControl+Right',globalShortcut: 'CommandOrControl+Alt+Right',},{id: 'volumeUp',name: '增加音量',shortcut: 'CommandOrControl+Up',globalShortcut: 'CommandOrControl+Alt+Up',},{id: 'volumeDown',name: '减少音量',shortcut: 'CommandOrControl+Down',globalShortcut: 'CommandOrControl+Alt+Down',},{id: 'processForward',name: '快进(3s)',shortcut: 'CommandOrControl+]',globalShortcut: 'CommandOrControl+Alt+]'},{id: 'processBack',name: '后退(3s)',shortcut: 'CommandOrControl+[',globalShortcut: 'CommandOrControl+Alt+['},]
  }
  const clearMusicVideo = () => {
      windowApi.clearUnusedVideo().then(result => {
        if(result == 'noSavePath') {
            noticeOpen('请先在设置中设置音乐视频缓存目录', 2)
            return
        }
        else if(result) noticeOpen('清除完毕', 3)
        else noticeOpen('删除失败', 3)
      })
  }
  const setMusicVideo = () => {
    if(!playerStore.musicVideo)
        dialogOpen('确定开启', '开启后此功能会消耗一定性能且可能造成卡顿，确定开启吗？', openMusicVideo)
    else
        openMusicVideo(true)
  }
  const openMusicVideo = (flag) => {
    if(flag)
        playerStore.musicVideo = !playerStore.musicVideo
  }
  const setLyricBlur = () => {
    if(!playerStore.lyricBlur)
        dialogOpen('确定开启', '开启后此功能会消耗一定性能且可能造成卡顿，确定开启吗？', openLyricBlur)
    else
        openLyricBlur(true)
  }
  const openLyricBlur = (flag) => {
    if(flag) playerStore.lyricBlur = !playerStore.lyricBlur
  }
  const userLogout = () => {
    if(isLogin()){
        logout().then(result => {
        if(result.code == 200) {
            window.localStorage.clear()
            userStore.user = null
            userStore.biliUser = null
            router.push('/')
            noticeOpen("已退出账号", 2)
        }
        else noticeOpen("退出登录失败", 2)
        })
    } else noticeOpen("您已退出账号", 2)
  }
  const save = () => {
    selectedShortcut.value = null
    setAppSettings()
    initSettings()
    noticeOpen("设置已保存", 2)
  }
  const toGithub = () => {
    windowApi.toRegister("https://github.com/Kaidesuyo/Hydrogen-Music")
  }
</script>

<template>
  <div class="settings-page" @click="selectedShortcut = null">
    <div class="view-control">
      <svg t="1669039513804" @click="routerChange()" class="router-last" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1053" width="200" height="200"><path d="M716.608 1010.112L218.88 512.384 717.376 13.888l45.248 45.248-453.248 453.248 452.48 452.48z" p-id="1054"></path></svg>
      <span class="setting-title">设置(离开页面以保存设置或
        <span class="save" @click="save()">点击</span>
        保存)
      </span>
    </div>
    <div class="settings-container">
        <h1 class="settings-title">设置</h1>
        <div class="settings-user-info" v-if="isLogin()">
            <div class="user">
                <div class="user-head">
                    <img :src="userStore.user.avatarUrl + '?param=300y300'" alt="">
                </div>
                <div class="user-info">
                    <div class="user-name">{{userStore.user.nickname}}</div>
                    <div class="user-vip" v-if="vipInfo && userStore.user.vipType != 0">
                        <img :src="vipInfo.redVipDynamicIconUrl" alt="">
                    </div>
                </div>
            </div>
            <div class="logout" @click="userLogout()">
                <span>退出</span>
            </div>
        </div>
        <div class="settings">
            <div class="settings-item">
                <h2 class="item-title">音乐</h2>
                <div class="line"></div>
                <div class="item-options">
                    <div class="option">
                        <div class="option-name">音质选择</div>
                        <div class="option-operation">
                            <ASelect v-model:value="musicLevel" :bordered="false" size="small" :showArrow="false">
                                <select-option value="standard">标准</select-option>
                                <select-option value="higher">较高</select-option>
                                <select-option value="exhigh">极高</select-option>
                                <select-option value="lossless">无损</select-option>
                                <select-option value="hires">Hi-Res</select-option>
                            </ASelect>
                        </div>
                    </div>
                    <div class="option">
                        <div class="option-name">开启歌词模糊</div>
                        <div class="option-operation">
                            <div class="toggle" @click="setLyricBlur()">
                                <div class="toggle-off" :class="{'toggle-on-in': playerStore.lyricBlur}">{{playerStore.lyricBlur ? '已开启' : '已关闭'}}</div>
                                <Transition name="toggle">
                                    <div class="toggle-on" v-show="playerStore.lyricBlur"></div>
                                </Transition>
                            </div>
                        </div>
                    </div>
                    <div class="option">
                        <div class="option-name">歌词字体大小</div>
                        <div class="option-operation">
                            <input v-model="lyricSize" name="lyricSize">
                        </div>
                    </div>
                    <div class="option">
                        <div class="option-name">歌词翻译字体大小</div>
                        <div class="option-operation">
                            <input v-model="tlyricSize" name="tlyricSize">
                        </div>
                    </div>
                    <div class="option">
                        <div class="option-name">罗马歌词字体大小</div>
                        <div class="option-operation">
                            <input v-model="rlyricSize" name="rlyricSize">
                        </div>
                    </div>
                    <div class="option">
                        <div class="option-name">歌词间奏等待时间(单位：秒)</div>
                        <div class="option-operation">
                            <input v-model="lyricInterlude" name="lyricInterlude">
                        </div>
                    </div>
                    <div class="option">
                        <div class="option-name">开启音乐视频功能</div>
                        <div class="option-operation">
                            <div class="toggle" @click="setMusicVideo()">
                                <div class="toggle-off" :class="{'toggle-on-in': playerStore.musicVideo}">{{playerStore.musicVideo ? '已开启' : '已关闭'}}</div>
                                <Transition name="toggle">
                                    <div class="toggle-on" v-show="playerStore.musicVideo"></div>
                                </Transition>
                            </div>
                        </div>
                    </div>
                    <div class="option" v-if="playerStore.musicVideo">
                        <div class="option-name">删除所有未被使用的音乐视频</div>
                        <div class="option-operation">
                            <div class="button" @click="clearMusicVideo()">清除</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="settings-item">
                <h2 class="item-title">本地</h2>
                <div class="line"></div>
                <div class="item-options">
                    <div class="option" v-if="playerStore.musicVideo">
                        <div class="option-name">音乐视频缓存</div>
                        <div class="select-download-folder">
                            <div class="selected-folder" :title="downloadFolder">{{videoFolder ? videoFolder : '待选择'}}</div>
                            <div class="select-option" @click="selectFolder('video')">选择</div>
                        </div>
                    </div>
                    <div class="option">
                        <div class="option-name">下载目录</div>
                        <div class="select-download-folder">
                            <div class="selected-folder" :title="downloadFolder">{{downloadFolder ? downloadFolder : '待选择'}}</div>
                            <div class="select-option" @click="selectFolder('download')">选择</div>
                        </div>
                    </div>
                    <div class="option">
                        <div class="option-name">本地目录</div>
                        <div class="local-folder">
                            <div class="selected-local-folder-item">
                                <div class="selected-folder" :title="item" @contextmenu="deleteLocalFolder(index)" v-for="(item, index) in localFolder">{{item ? item : '请添加'}}</div>
                                <div class="tip">您可以同时添加多个目录,右键移除您不需要的目录。数据量过大时需要一定扫描时间,请稍等。</div>
                            </div>
                            <div class="add-option" @click="selectFolder('local')">添加</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="settings-item">
                <h2 class="item-title">快捷键</h2>
                <div class="line"></div>
                <div class="item-options" tabindex='0' @keydown="inputShortcut($event)">
                    <div class="option">
                        <div class="option-name">开启全局快捷键</div>
                        <div class="option-operation">
                            <div class="toggle" @click="globalShortcuts = !globalShortcuts">
                                <div class="toggle-off" :class="{'toggle-on-in': globalShortcuts}">{{globalShortcuts ? '已开启' : '已关闭'}}</div>
                                <Transition name="toggle">
                                    <div class="toggle-on" v-show="globalShortcuts"></div>
                                </Transition>
                            </div>
                        </div>
                    </div>
                    <div class="shortcuts-title">
                        <div class="title-function">功能说明</div>
                        <div class="title-shortcuts">快捷键</div>
                        <div class="title-globalShortcuts" :class="{'forbid-shortcuts': !globalShortcuts}">全局快捷键</div>
                    </div>
                    <div class="shortcuts" v-for="(item, index) in shortcutsList">
                        <div class="shortcut-name">{{item.name}}</div>
                        <div class="shortcut" :class="{'shortcut-selected': (selectedShortcut && selectedShortcut.id == item.id && !selectedShortcut.type)}" @click.stop="changeShortcut(item.id, false)">{{formatShortcutName(item.shortcut)}}</div>
                        <div class="globalShortcut" :class="{'shortcut-selected': (selectedShortcut && selectedShortcut.id == item.id && selectedShortcut.type), 'forbid-shortcuts': !globalShortcuts}" @click.stop="changeShortcut(item.id, true)">{{formatShortcutName(item.globalShortcut)}}</div>
                    </div>
                    <div class="default-shortcuts" @click="setDefaultShortcuts()">恢复默认快捷键</div>
                </div>
            </div>
            <div class="settings-item">
                <h2 class="item-title">其他</h2>
                <div class="line"></div>
                <div class="item-options">
                    <div class="option">
                        <div class="option-name">开启首页页面</div>
                        <div class="option-operation">
                            <div class="toggle" @click="userStore.homePage = !userStore.homePage">
                                <div class="toggle-off" :class="{'toggle-on-in': userStore.homePage}">{{userStore.homePage ? '已开启' : '已关闭'}}</div>
                                <Transition name="toggle">
                                    <div class="toggle-on" v-show="userStore.homePage"></div>
                                </Transition>
                            </div>
                        </div>
                    </div>
                    <div class="option">
                        <div class="option-name">开启云盘页面</div>
                        <div class="option-operation">
                            <div class="toggle" @click="userStore.cloudDiskPage = !userStore.cloudDiskPage">
                                <div class="toggle-off" :class="{'toggle-on-in': userStore.cloudDiskPage}">{{userStore.cloudDiskPage ? '已开启' : '已关闭'}}</div>
                                <Transition name="toggle">
                                    <div class="toggle-on" v-show="userStore.cloudDiskPage"></div>
                                </Transition>
                            </div>
                        </div>
                    </div>
                    <div class="option">
                        <div class="option-name">退出应用时</div>
                        <div class="option-operation">
                            <ASelect v-model:value="quitApp" :bordered="false" size="small" :showArrow="false">
                                <select-option value="minimize">最小化至托盘</select-option>
                                <select-option value="quit">直接退出</select-option>
                            </ASelect>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="app-version">
            <div class="app-icon">
                <img src="../assets/icon/icon.ico" alt="">
            </div>
            <div class="version">V0.3.0</div>
            <div class="app-author" @click="toGithub()">Made by Kaidesuyo</div>
        </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .settings-page{
    width: 100%;
    height: 100%;
    .view-control{
      margin-bottom: 15Px;
      margin-left: -8Px;
      height: 32Px;
      display: flex;
      flex-direction: row;
      align-items: center;
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
        margin-right: 5Px;
      }
      .setting-title{
        font: 17Px SourceHanSansCN-Bold;
        color: black;
        .save{
            font-size: 15px;
            padding: 6px;
            background-color: rgba(255, 255, 255, 0.35);
            transition: 0.1s;
            &:hover{
                cursor: pointer;
                opacity: 0.8;
            }
            &:active{
                opacity: 0.5;
            }
        }
      }
    }
    .settings-container{
        margin: 0 auto;
        padding-bottom: 140px;
        width: 80%;
        height: calc(100% - 47px);
        overflow: auto;
        &::-webkit-scrollbar{
            display: none;
        }
        .settings-title{
            font-family: SourceHanSansCN-Bold;
            color: black;
            text-align: left;
        }
        .settings-user-info{
            padding: 10px 40px;
            width: 100%;
            height: 100px;
            background-color: rgba(255, 255, 255, 0.35);
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            .user{
                display: flex;
                flex-direction: row;
                align-items: center;
                .user-head{
                    margin-right: 15px;
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    overflow: hidden;
                    img{
                        width: 100%;
                        height: 100%;
                    }
                }
                .user-info{
                    .user-name{
                        font: 20px Source Han Sans;
                        font-weight: bold;
                        color: black;
                    }
                    .user-vip{
                        width: 40px;
                        img{
                            width: 100%;
                        }
                    }
                }
            }
            .logout{
                font: 14Px SourceHanSansCN-Bold;
                font-weight: bold;
                color: black;
                transition: 0.2s;
                &:hover{
                    cursor: pointer;
                }
                &:active{
                    transform: scale(0.95);
                }
            }
        }
        .settings{
            width: 100%;
            .settings-item{
                margin-top: 45px;
                width: 100%;
                .item-title{
                    margin: 0;
                    font: 20Px SourceHanSansCN-Bold;
                    color: black;
                    font-family: SourceHanSansCN-Bold;
                    color: black;
                    text-align: left;
                }
                .line{
                    margin-top: 8px;
                    margin-bottom: 25px;
                    width: 100%;
                    height: 0.5px;
                    background-color: rgba(0, 0, 0, 0.2);
                }
                .item-options{
                    outline: none;
                    .option{
                        margin-bottom: 28px;
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        justify-content: space-between;
                        .option-name{
                            font-family: SourceHanSansCN-Bold;
                            font-size: 16px;
                            color: black;
                            text-align: left;
                        }
                        input, .ant-select{
                            margin-right: 1px;
                            width: 200px;
                            height: 34px;
                            padding: 5px 1px;
                            background-color: rgba(255, 255, 255, 0.35);
                            color: black;
                            border: none;
                            outline: none;
                            appearance:none;
                            font: 13px SourceHanSansCN-Bold;
                            text-align: center;
                            transition: 0.2s;
                            &:hover{
                                cursor: pointer;
                                opacity: 0.8;
                                box-shadow: 0 0 0 1px black;
                            }
                        }
                        select{
                            padding: 8px 10px;
                        }
                        option{
                            background-color: rgba(255, 255, 255, 0.35);
                            border: none;
                            outline: none;
                        }
                        .toggle{
                            margin-right: 1px;
                            height: 34px;
                            width: 200px;
                            position: relative;
                            overflow: hidden;
                            &:hover{
                                cursor: pointer;
                            }
                            .toggle-on, .toggle-off{
                                padding: 5px 10px;
                                width: 100%;
                                height: 100%;
                                font: 13px SourceHanSansCN-Bold;
                                transition: 0.2s;
                                line-height: 24px;
                            }
                            .toggle-off{
                                background-color: rgba(255, 255, 255, 0.35);
                            }
                            .toggle-on{
                                background-color: black;
                                position: absolute;
                                top: 0;
                                left: 0;
                                z-index: -1;
                            }
                            .toggle-on-in{
                                color: white;
                                background-color: transparent;
                            }
                        }
                        .button{
                            margin-right: 1px;
                            padding: 5px 10px;
                            width: 200px;
                            background-color: rgba(255, 255, 255, 0.35);
                            font: 13px SourceHanSansCN-Bold;
                            &:hover{
                                cursor: pointer;
                                opacity: 0.8;
                                box-shadow: 0 0 0 1px black;
                            }
                        }
                        .select-download-folder{
                            display: flex;
                            flex-direction: row;
                            align-items: center;
                            .selected-folder{
                                width: 50vw;
                                height: 30px;
                                background-color: rgba(255, 255, 255, 0.35);
                                font: 13px SourceHanSansCN-Bold;
                                color: black;
                                line-height: 30px;
                                overflow: hidden;
                            }
                            .select-option{
                                margin-right: 2px;
                                margin-left: 15px;
                                padding: 5px 15px;
                                font: 13px SourceHanSansCN-Bold;
                                color: black;
                                background-color: rgba(255, 255, 255, 0.35);
                                transition: 0.2s;
                                &:hover{
                                    cursor: pointer;
                                    opacity: 0.8;
                                    box-shadow: 0 0 0 1px black;
                                }
                            }
                        }
                        .local-folder{
                            display: flex;
                            flex-direction: row;
                            align-items: center;
                            .selected-local-folder-item{
                                display: flex;
                                flex-direction: column;
                                .selected-folder{
                                    margin-bottom: 10px;
                                    width: 50vw;
                                    height: 30px;
                                    background-color: rgba(255, 255, 255, 0.35);
                                    font: 13px SourceHanSansCN-Bold;
                                    color: black;
                                    line-height: 30px;
                                    overflow: hidden;
                                }
                                .tip{
                                    font: 10px SourceHanSansCN-Bold;
                                    color: black;
                                    text-align: left;
                                }
                            }
                            .add-option{
                                margin-right: 2px;
                                margin-left: 15px;
                                padding: 5px 15px;
                                font: 13px SourceHanSansCN-Bold;
                                color: black;
                                background-color: rgba(255, 255, 255, 0.35);
                                transition: 0.2s;
                                &:hover{
                                    cursor: pointer;
                                    opacity: 0.8;
                                    box-shadow: 0 0 0 1px black;
                                }
                            }
                        }
                    }
                    .forbid-shortcuts{
                        opacity: 0.5;
                        pointer-events: none;
                    }
                    .shortcuts-title{
                        font: 14px SourceHanSansCN-Bold;
                        color: black;
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        text-align: left;
                        div{
                            margin-right: 15px;
                            padding: 0 6px;
                        }
                        .title-function{
                            min-width: 130px;
                        }
                        .title-shortcuts, .title-globalShortcuts{
                            min-width: 200px;
                        }
                    }
                    .shortcuts{
                        font: 14px SourceHanSansCN-Bold;
                        color: black;
                        display: flex;
                        flex-direction: row;
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        text-align: left;
                        div{
                            margin-top: 15px;
                            margin-right: 15px;
                            padding: 6px;
                            background-color: rgba(255, 255, 255, 0.35);
                        }
                        .shortcut-name{
                            min-width: 130px;
                            background-color: transparent;
                        }
                        .shortcut, .globalShortcut{
                            min-width: 200px;
                            &:hover{
                                cursor: pointer;
                            }
                        }
                        .shortcut-selected{
                            box-shadow: 0 0 0 1px black;
                        }
                    }
                    .default-shortcuts{
                        margin-top: 15px;
                        margin-left: 1px;
                        width: 120px;
                        padding: 6px;
                        background-color: rgba(255, 255, 255, 0.35);
                        font: 14px SourceHanSansCN-Bold;
                        transition: 0.2s;
                        color: black;
                        &:hover{
                            cursor: pointer;
                            box-shadow: 0 0 0 1px black;
                        }
                    }
                }
            }
        }
        .app-version{
            display: flex;
            flex-direction: column;
            align-items: center;
            .app-icon{
                margin-bottom: 10px;
                width: 65px;
                height: 65px;
                img{
                    width: 100%;
                    height: 100%;
                }
            }
            .version{
                font: 14px Geometos;
                color: black;
            }
            .app-author{
                margin-top: 10px;
                font: 14px Bender-Bold;
                color: black;
                &:hover{
                    cursor: pointer;
                    text-decoration: underline;
                }
            }
        }
    }
  }
  .toggle-enter-active,
  .toggle-leave-active {
    transition: 0.1s;
  }
  .toggle-enter-from,
  .toggle-leave-to {
    transform: translateX(-100%)
  }
</style>