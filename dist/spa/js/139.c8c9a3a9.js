"use strict";(self["webpackChunkd3_map"]=self["webpackChunkd3_map"]||[]).push([[139],{8139:(e,a,t)=>{t.r(a),t.d(a,{default:()=>u});t(71);var s=t(3673);const l={class:"container mt-10"},n={class:"card bg-white"},r=["src"],c={class:"mt-10",style:{"text-align":"center"}},i=(0,s._)("h3",null,"SERVER IMAGE",-1),o=["src"];function m(e,a,t,m,g,d){return(0,s.wg)(),(0,s.iD)("div",null,[(0,s._)("div",l,[(0,s._)("div",n,[(0,s._)("img",{style:{},src:g.image,alt:""},null,8,r),(0,s._)("input",{onChange:a[0]||(a[0]=(...e)=>d.handleImage&&d.handleImage(...e)),class:"custom-input",type:"file",accept:"image/*"},null,32)])]),(0,s._)("div",c,[i,(0,s._)("img",{src:g.remoteUrl,alt:""},null,8,o)])])}const g={name:"home",data(){return{image:"",remoteUrl:""}},methods:{handleImage(e){const a=e.target.files[0];console.log("selectedImage : ",a),console.log(this.createBase64Image(a))},createBase64Image(e){const a=new FileReader;a.onload=e=>{this.image=e.target.result,console.log("this.image",this.image)},a.readAsDataURL(e)},uploadImage(){const{image:e}=this;axios.post("http://127.0.0.1:8081/upload",{image:e}).then((e=>{this.remoteUrl=e.data.url})).catch((e=>new Error(e.message)))}}};var d=t(4260);const h=(0,d.Z)(g,[["render",m]]),u=h}}]);