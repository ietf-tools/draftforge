import './base.css'
import { createApp } from 'vue'
import App from './app.vue'

const app = createApp(App)
app.config.globalProperties.vscode = acquireVsCodeApi()
app.mount('#app')
