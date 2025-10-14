

import Dashboard from '../pages/Dashboard'
import CodexManagement from '../pages/CodexManagement'
import ClaudeCodeManagement from '../pages/ClaudeCodeManagement'
import ClaudeCodeStore from '../pages/ClaudeCodeStore'
import Settings from '../pages/Settings'

const routes = [
  {
    path: '/',
    component: Dashboard,
    title: '仪表盘'
  },
  {
    path: '/dashboard',
    component: Dashboard,
    title: '仪表盘'
  },
  {
    path: '/codex',
    component: CodexManagement,
    title: 'Codex管理'
  },
  {
    path: '/claude-code',
    component: ClaudeCodeManagement,
    title: 'Claude Code管理'
  },
  {
    path: '/claude-code-store',
    component: ClaudeCodeStore,
    title: 'Claude Code Store'
  },
  {
    path: '/settings',
    component: Settings,
    title: '系统设置'
  }
]

export default routes