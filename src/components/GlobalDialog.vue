<script setup>
  import { ref, watchEffect } from 'vue'
  import { dialogCancel, dialogConfirm } from '../utils/dialog'
  import { useOtherStore } from '../store/otherStore';
  import { storeToRefs } from 'pinia';

  const otherStore =  useOtherStore()
  const { dialogShow, dialogHeader, dialogText } = storeToRefs(otherStore)

  const isActive = ref(false)
  watchEffect(()=>{
    if (dialogShow.value) {
      setTimeout(() => {
        isActive.value = true
      }, 500);
    } else {
      isActive.value = false
    }
  })
</script>

<template>
  <div class="global-dialog" v-show="dialogShow">
  </div>
  <transition name="dialog-fade">
    <div class="dialog-container" :class="{'dialog-container-active': isActive}" v-if="dialogShow">
        <div class="dialog">
            <div class="dialog-header">
                <span class="header-title">{{dialogHeader}}</span>
            </div>
            <div class="dialog-content">
                <span class="content-text">{{dialogText}}</span>
            </div>
            <div class="dialog-option">
                <div class="option-cancel" @click="dialogCancel()">取消</div>
                <div class="option-confirm" @click="dialogConfirm()">确认</div>
            </div>
        </div>
        <span class="dialog-style dialog-style1"></span>
        <span class="dialog-style dialog-style2"></span>
        <span class="dialog-style dialog-style3"></span>
        <span class="dialog-style dialog-style4"></span>
    </div>
  </transition>
  </template>

<style scoped lang="scss">
  .global-dialog{
    width: 100%;
    height: 100%;
    position: fixed;
    top: 0;
    left: 0;
    background-color: rgba(0, 0, 0, 0.1);
    z-index: 999;
  }
  .dialog-container{
      z-index: 1000;
      width: 0;
      height: 0;
      background-image: url('../assets/img/halftone.png');
      background-size: 40%;
      background-repeat: repeat;
      background-color: rgb(14, 14, 14);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);

      &-active {
        width: 300Px;height: 150Px;padding: 15Px 20px;
      }
      .dialog{
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          overflow: hidden;
          .dialog-header{
              .header-title{
                  font: 16Px SourceHanSansCN-Bold;
                  color: rgba(255, 255, 255, 0.95);
              }
          }
          .dialog-content{
              .content-text{
                  font: 14Px SourceHanSansCN-Bold;
                  color: rgba(255, 255, 255, 0.9);
              }
          }
          .dialog-option{
              display: flex;
              flex-direction: row;
              align-items: center;
              .option-cancel{
                  margin-right: 20Px;
              }
              .option-cancel, .option-confirm{
                  width: 75Px;
                  height: 28Px;
                  border: 0.5Px solid rgba(255, 255, 255, 0.9);
                  font: 14Px SourceHanSansCN-Bold;
                  color: rgba(255, 255, 255, 0.9);
                  line-height: 27Px;
                  &:hover{
                      cursor: pointer;
                      background-color: rgba(255, 255, 255, 0.9);
                      color: black;
                  }
              }
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
</style>

<style lang="scss">
.dialog-fade-enter-active {
  animation: dialog-container-in 0.4s 0.15s forwards;
}
.dialog-fade-leave-active {
  animation: dialog-container-in 0.4s reverse;
}

@keyframes dialog-container-in {
  0%{width: 0;height: 0;padding: 0;}
  50%{width: 300Px;height: 0;padding: 0;}
  100%{width: 300Px;height: 150Px;padding: 15Px 20px;}
}

</style>