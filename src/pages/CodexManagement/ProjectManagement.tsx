import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Plus, Folder, Play, Trash2, FolderOpen, Terminal } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { CodexProject, dbManager, initDatabase } from '@/lib/indexedDB'

const ProjectManagement = () => {
  const [projects, setProjects] = useState<CodexProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    description: ''
  })

  // 初始化数据库并加载项目
  useEffect(() => {
    const initAndLoadProjects = async () => {
      try {
        await initDatabase()
        await loadProjects()
      } catch (error) {
        console.error('初始化失败:', error)
        setError('初始化数据库失败')
      } finally {
        setIsLoading(false)
      }
    }

    initAndLoadProjects()
  }, [])

  // 加载项目列表
  const loadProjects = async () => {
    try {
      const projectList = await dbManager.getProjects()
      console.log('加载的项目列表:', projectList)
      setProjects(projectList)
    } catch (error) {
      console.error('加载项目失败:', error)
      setError('加载项目列表失败')
    }
  }

  // 选择文件夹
  const selectFolder = async () => {
    try {
      const folderPath = await invoke<string | null>('select_folder')
      if (folderPath) {
        setFormData(prev => ({ ...prev, path: folderPath }))
      }
    } catch (error) {
      console.error('选择文件夹失败:', error)
      setError('选择文件夹失败')
    }
  }

  // 添加项目
  const addProject = async () => {
    if (!formData.name.trim() || !formData.path.trim()) {
      setError('项目名称和路径不能为空')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // 检查路径是否已存在
      const exists = await dbManager.projectExists(formData.path)
      if (exists) {
        setError('该路径已存在项目')
        return
      }

      await dbManager.addProject({
        name: formData.name.trim(),
        path: formData.path.trim(),
        description: formData.description.trim() || undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // 重新加载项目列表
      await loadProjects()
      
      // 重置表单并关闭对话框
      setFormData({ name: '', path: '', description: '' })
      setIsDialogOpen(false)
    } catch (error) {
      console.error('添加项目失败:', error)
      setError('添加项目失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 使用Codex打开项目
  const openInCodex = async (project: CodexProject) => {
    try {
      await invoke('open_folder_in_codex', { path: project.path })
    } catch (error) {
      console.error('打开项目失败:', error)
      setError(`打开项目失败: ${error}`)
    }
  }

  // 在终端中打开项目
  const openInTerminal = async (project: CodexProject) => {
    try {
      await invoke('open_project_in_terminal', { path: project.path })
    } catch (error) {
      console.error('在终端中打开项目失败:', error)
      setError(`在终端中打开项目失败: ${error}`)
    }
  }

  // 删除项目
  const deleteProject = async (project: CodexProject) => {
    if (!project.id) return
    
    if (!confirm(`确定要删除项目 "${project.name}" 吗？`)) {
      return
    }

    try {
      await dbManager.deleteProject(project.id)
      await loadProjects()
    } catch (error) {
      console.error('删除项目失败:', error)
      setError('删除项目失败')
    }
  }

  // 格式化日期
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Spinner className="mx-auto" />
          <p className="text-muted-foreground">正在加载项目列表...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 添加项目按钮 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">项目列表</h3>
          <p className="text-sm text-muted-foreground">
            管理您的 Codex 项目
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              添加项目
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>添加新项目</DialogTitle>
              <DialogDescription>
                创建一个新的 Codex 项目配置
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">项目名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入项目名称"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="path">项目路径</Label>
                <div className="flex gap-2">
                  <Input
                    id="path"
                    value={formData.path}
                    onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
                    placeholder="选择项目文件夹"
                    readOnly
                  />
                  <Button type="button" variant="outline" onClick={selectFolder}>
                    <Folder className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">项目描述（可选）</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="输入项目描述"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={addProject}
                disabled={isSubmitting || !formData.name.trim() || !formData.path.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    添加中...
                  </>
                ) : (
                  '添加项目'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 项目列表 */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无项目</h3>
            <p className="text-muted-foreground text-center mb-4">
              您还没有添加任何项目，点击上方按钮添加第一个项目
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            console.log('渲染项目:', project)
            return (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      {project.path}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {formatDate(project.createdAt)}
                  </Badge>
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {project.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => openInCodex(project)}
                    className="flex-1"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    使用 Codex 打开
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openInTerminal(project)}
                    className="flex-1"
                  >
                    <Terminal className="mr-2 h-4 w-4" />
                    打开项目
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteProject(project)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}
    </div>
  )
}

export default ProjectManagement