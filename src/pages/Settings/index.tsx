import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import packageInfo from '../../../package.json'

interface ReleaseAsset {
  name: string
  browser_download_url: string
  size: number
  content_type?: string
}

interface ReleaseInfo {
  version: string
  htmlUrl: string
  notes: string
  assets: ReleaseAsset[]
  publishedAt?: string
}

const GITHUB_RELEASE_API =
  'https://api.github.com/repos/AIDotNet/MakingStore/releases/latest'

const fallbackPackageVersion =
  (packageInfo as { version?: string }).version ?? '0.0.0'

const removePrefix = (version: string) => version.replace(/^v/i, '')

const compareVersions = (latest: string, current: string): number => {
  const latestParts = removePrefix(latest)
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10) || 0)
  const currentParts = removePrefix(current)
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10) || 0)

  const maxLength = Math.max(latestParts.length, currentParts.length)

  for (let index = 0; index < maxLength; index += 1) {
    const latestValue = latestParts[index] ?? 0
    const currentValue = currentParts[index] ?? 0

    if (latestValue > currentValue) {
      return 1
    }

    if (latestValue < currentValue) {
      return -1
    }
  }

  return 0
}

const formatFileSize = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) {
    return ''
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }

  if (size >= 1024) {
    return `${(size / 1024).toFixed(2)} KB`
  }

  return `${size} B`
}

const Settings = () => {
  const [currentVersion, setCurrentVersion] = useState<string>(
    fallbackPackageVersion
  )
  const [latestRelease, setLatestRelease] = useState<ReleaseInfo | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  const formattedCurrentVersion = useMemo(() => {
    if (!currentVersion) {
      return '未知'
    }

    return currentVersion.startsWith('v') ? currentVersion : `v${currentVersion}`
  }, [currentVersion])

  const handleDownload = useCallback(async (url: string) => {
    if (!url) {
      return
    }

    try {
      const { open } = await import('@tauri-apps/plugin-shell')
      await open(url)
    } catch (shellError) {
      console.warn('使用 Tauri Shell 打开链接失败，回退到浏览器。', shellError)
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }, [])

  const checkForUpdates = useCallback(async () => {
    if (!currentVersion) {
      return
    }

    setChecking(true)
    setError(null)

    try {
      const response = await fetch(GITHUB_RELEASE_API, {
        headers: {
          Accept: 'application/vnd.github+json'
        }
      })

      if (!response.ok) {
        throw new Error(`GitHub 接口返回状态码 ${response.status}`)
      }

      const data = (await response.json()) as {
        tag_name?: string
        name?: string
        body?: string
        assets?: ReleaseAsset[]
        html_url?: string
        published_at?: string
      }

      const latestVersion = (data.tag_name || data.name || '').trim()
      const releaseAssets = Array.isArray(data.assets)
        ? data.assets.map((asset) => ({
            name: asset.name,
            browser_download_url: asset.browser_download_url,
            size: asset.size,
            content_type: asset.content_type
          }))
        : []

      const releaseInfo: ReleaseInfo = {
        version: latestVersion,
        notes: data.body ?? '',
        assets: releaseAssets,
        htmlUrl:
          data.html_url || 'https://github.com/AIDotNet/MakingStore/releases',
        publishedAt: data.published_at
      }

      setLatestRelease(releaseInfo)

      if (latestVersion) {
        const hasNewer = compareVersions(latestVersion, currentVersion) > 0
        setUpdateAvailable(hasNewer)
      } else {
        setUpdateAvailable(false)
      }
    } catch (fetchError) {
      console.error('检查更新失败', fetchError)
      const message =
        fetchError instanceof Error ? fetchError.message : '未知错误'

      if (message.includes('rate limit')) {
        setError('GitHub 接口请求频率受限，请稍后重试。')
      } else {
        setError('检测更新失败，请检查网络连接后重试。')
      }
    } finally {
      setChecking(false)
    }
  }, [currentVersion])

  useEffect(() => {
    const resolveVersion = async () => {
      try {
        const { getVersion } = await import('@tauri-apps/api/app')
        const version = await getVersion()
        if (version) {
          setCurrentVersion(version)
        }
      } catch (tauriError) {
        console.warn('从 Tauri 获取版本号失败，使用 package.json 版本。', tauriError)
        setCurrentVersion(fallbackPackageVersion)
      }
    }

    void resolveVersion()
  }, [])

  useEffect(() => {
    if (currentVersion) {
      void checkForUpdates()
    }
  }, [checkForUpdates, currentVersion])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">系统设置</h1>
        <p className="text-muted-foreground">配置应用程序设置</p>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">当前版本</p>
            <p className="text-lg font-semibold text-foreground">
              {formattedCurrentVersion}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={checkForUpdates} disabled={checking}>
              {checking ? '检测中…' : '立即检查更新'}
            </Button>

            {updateAvailable && latestRelease?.assets.length ? (
              <Button
                variant="secondary"
                onClick={() =>
                  handleDownload(latestRelease.assets[0].browser_download_url)
                }
              >
                下载最新版本
              </Button>
            ) : null}
          </div>
        </div>

        {latestRelease ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-sm text-muted-foreground">最新版本</p>
                <div className="flex items-center gap-2 text-base font-medium text-foreground">
                  <span>
                    {latestRelease.version
                      ? latestRelease.version.startsWith('v')
                        ? latestRelease.version
                        : `v${latestRelease.version}`
                      : '暂无版本信息'}
                  </span>
                  {updateAvailable ? (
                    <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600">
                      发现新版本
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600">
                      已是最新
                    </span>
                  )}
                </div>
                {latestRelease.publishedAt ? (
                  <p className="text-xs text-muted-foreground">
                    发布于 {new Date(latestRelease.publishedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            </div>

            {updateAvailable && latestRelease.assets.length ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">请选择要下载的安装包</p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {latestRelease.assets.map((asset) => (
                    <button
                      key={asset.browser_download_url}
                      type="button"
                      onClick={() => handleDownload(asset.browser_download_url)}
                      className="flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-left text-sm transition hover:border-primary hover:bg-primary/10"
                    >
                      <span className="font-medium text-foreground">
                        {asset.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(asset.size)}
                        {asset.content_type ? ` · ${asset.content_type}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {latestRelease.notes.trim() ? (
              <details className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  更新内容
                </summary>
                <div className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {latestRelease.notes}
                </div>
              </details>
            ) : null}

            <div className="text-xs text-muted-foreground">
              如需手动下载，可访问{' '}
              <a
                href={latestRelease.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-4"
              >
                GitHub Releases 页面
              </a>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!updateAvailable && latestRelease && !error ? (
          <p className="text-sm text-muted-foreground">
            当前程序已是最新版本，无需更新。
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default Settings
