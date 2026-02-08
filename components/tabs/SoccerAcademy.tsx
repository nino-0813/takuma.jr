import React, { useState, useEffect } from 'react';
import { Video, Play, Plus, ChevronLeft, Calendar, Users, Trash2, Upload, Folder, FolderPlus } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { matchVideos as matchVideosDb, matchVideoFolders as matchVideoFoldersDb } from '../../lib/database';
import { compressVideo } from '../../lib/videoCompress';

interface MatchVideoFolder {
  id: string;
  name: string;
  created_at: string;
}

interface MatchVideoRow {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  match_date: string;
  opponent: string;
  video_url: string;
  note: string;
  created_at: string;
}

function getYoutubeThumbUrl(url: string): string | null {
  const u = (url || '').trim();
  if (!u) return null;
  const m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (m) return `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`;
  return null;
}

function VideoThumbnail({ videoUrl, title }: { videoUrl: string; title: string }) {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const thumb = getYoutubeThumbUrl(videoUrl);
  const isExternal = (videoUrl || '').trim().startsWith('http');

  useEffect(() => {
    if (thumb || !videoUrl?.trim()) return;
    if (isExternal) {
      setPlaybackUrl(videoUrl.trim());
      return;
    }
    matchVideosDb.getPlaybackUrl(videoUrl).then((url) => setPlaybackUrl(url || null));
  }, [videoUrl, thumb, isExternal]);

  if (thumb) {
    return (
      <img
        src={thumb}
        alt={title}
        className="w-full h-full object-cover"
      />
    );
  }
  if (playbackUrl) {
    return (
      <video
        src={playbackUrl}
        muted
        preload="metadata"
        playsInline
        className="w-full h-full object-cover"
        aria-label={title}
      />
    );
  }
  return (
    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
      <Play size={32} className="text-white/80" />
    </div>
  );
}

const FOLDER_ALL = '__all__';
const FOLDER_UNSET = '__unset__';

export const SoccerAcademy: React.FC = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<MatchVideoRow[]>([]);
  const [folders, setFolders] = useState<MatchVideoFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(FOLDER_ALL);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<MatchVideoRow | null>(null);
  const [form, setForm] = useState({ title: '試合動画', match_date: '', opponent: '', video_url: '', note: '', folder_id: '' as string | null });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressBeforeUpload, setCompressBeforeUpload] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'compressing' | 'uploading'>('idle');
  const [compressPercent, setCompressPercent] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState<string>('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (user) {
      Promise.all([matchVideosDb.listAll(), matchVideoFoldersDb.list()]).then(([v, f]) => {
        setVideos(v.data || []);
        setFolders(f.data || []);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadVideos = () => {
    if (user) matchVideosDb.listAll().then(({ data }) => setVideos(data || []));
  };
  const loadFolders = () => {
    matchVideoFoldersDb.list().then(({ data }) => setFolders(data || []));
  };

  const filteredVideos = selectedFolderId === FOLDER_ALL
    ? videos
    : selectedFolderId === FOLDER_UNSET
      ? videos.filter((v) => !v.folder_id)
      : videos.filter((v) => v.folder_id === selectedFolderId);

  const openAdd = () => {
    setEditingId(null);
    setForm({ title: '試合動画', match_date: today, opponent: '', video_url: '', note: '', folder_id: selectedFolderId === FOLDER_ALL || selectedFolderId === FOLDER_UNSET ? null : selectedFolderId });
    setSelectedFile(null);
    setShowForm(true);
  };

  const openEdit = (row: MatchVideoRow) => {
    setEditingId(row.id);
    setForm({
      title: row.title || '試合動画',
      match_date: row.match_date || today,
      opponent: row.opponent || '',
      video_url: row.video_url || '',
      note: row.note || '',
      folder_id: row.folder_id || null,
    });
    setSelectedFile(null);
    setShowForm(true);
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    const { data, error } = await matchVideoFoldersDb.create(name);
    setCreatingFolder(false);
    if (error) {
      setNewFolderName('');
      setShowNewFolder(false);
      return;
    }
    loadFolders();
    setNewFolderName('');
    setShowNewFolder(false);
    if (data) setForm((f) => ({ ...f, folder_id: data.id }));
  };

  const save = async () => {
    if (!user || !form.match_date) return;
    setSaving(true);
    let videoUrl = form.video_url;

    if (selectedFile) {
      setUploadStatus(compressBeforeUpload ? 'compressing' : 'uploading');
      let blob: Blob = selectedFile;
        if (compressBeforeUpload) {
        setCompressPercent(0);
        const compressed = await compressVideo(selectedFile, (p) => {
          if (p.phase === 'loading') setUploadStatus('loading');
          else if (p.phase === 'compressing') {
            setUploadStatus('compressing');
            setCompressPercent(p.percent ?? 0);
          }
        });
        if (compressed) blob = compressed;
        else setUploadStatus('uploading'); // 圧縮失敗・タイムアウト時はそのままアップロード
      }
      setUploadStatus('uploading');
      const fileToUpload = blob instanceof File ? blob : new File([blob], 'video.mp4', { type: 'video/mp4' });
      const { path, error } = await matchVideosDb.uploadFile(user.id, fileToUpload);
      setUploadStatus('idle');
      if (error) {
        setSaving(false);
        alert('アップロードに失敗しました。Supabase の Storage でバケット「match-videos」が作成されているか確認してください。');
        return;
      }
      videoUrl = path;
    }

    const folderId = form.folder_id === '' ? null : form.folder_id;
    if (editingId) {
      await matchVideosDb.update(editingId, {
        title: form.title || '試合動画',
        match_date: form.match_date,
        opponent: form.opponent,
        video_url: videoUrl,
        note: form.note,
        folder_id: folderId,
      });
    } else {
      await matchVideosDb.create(user.id, {
        title: form.title || '試合動画',
        match_date: form.match_date,
        opponent: form.opponent,
        video_url: videoUrl,
        note: form.note,
        folder_id: folderId,
      });
    }
    setSaving(false);
    setShowForm(false);
    loadVideos();
  };

  const remove = async (id: string) => {
    if (!confirm('この試合動画を削除しますか？')) return;
    await matchVideosDb.delete(id);
    if (viewing?.id === id) setViewing(null);
    loadVideos();
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const groupVideosByYearMonth = (list: MatchVideoRow[]): { label: string; videos: MatchVideoRow[] }[] => {
    const map = new Map<string, MatchVideoRow[]>();
    for (const v of list) {
      const d = new Date(v.match_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    const keys = [...map.keys()].sort((a, b) => b.localeCompare(a));
    return keys.map((key) => {
      const videos = [...map.get(key)!].sort((a, b) => b.match_date.localeCompare(a.match_date));
      const d = new Date(videos[0].match_date);
      return { label: `${d.getFullYear()}年${d.getMonth() + 1}月`, videos };
    });
  };

  const toEmbedUrl = (url: string): string => {
    const u = (url || '').trim();
    if (!u) return '';
    const m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    return u;
  };

  // ストレージの動画用に署名付きURLを取得
  useEffect(() => {
    if (!viewing?.video_url?.trim()) {
      setPlaybackUrl('');
      return;
    }
    const u = viewing.video_url.trim();
    if (u.startsWith('http://') || u.startsWith('https://')) {
      setPlaybackUrl(toEmbedUrl(u));
      return;
    }
    matchVideosDb.getPlaybackUrl(u).then((url) => setPlaybackUrl(url || ''));
  }, [viewing?.id, viewing?.video_url]);

  // Detail / play view
  if (viewing) {
    const hasUrl = !!viewing.video_url?.trim();
    const isExternal = hasUrl && (viewing.video_url.startsWith('http://') || viewing.video_url.startsWith('https://'));
    return (
      <div className="flex flex-col h-full bg-slate-50 animate-fadeIn">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b border-slate-100">
          <button onClick={() => setViewing(null)} className="p-2 -ml-2 text-slate-600">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-base font-bold text-slate-800 truncate flex-1 mx-2">{viewing.title}</h2>
          {viewing.user_id === user?.id ? (
            <button onClick={() => remove(viewing.id)} className="p-2 text-red-500">
              <Trash2 size={18} />
            </button>
          ) : (
            <div className="w-10 h-10" />
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-6 pb-24">
          {hasUrl ? (
            <div className="rounded-2xl overflow-hidden bg-black aspect-video mb-6">
              {isExternal ? (
                <iframe
                  title={viewing.title}
                  src={playbackUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                playbackUrl ? (
                  <video src={playbackUrl} controls className="w-full h-full" playsInline />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/70">
                    <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden bg-slate-200 aspect-video mb-6 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <Video size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold">動画URLが未登録です</p>
                <p className="text-xs mt-1">編集から動画をアップロードするか、YouTubeのURLを追加できます</p>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <Calendar size={16} className="text-emerald-500" />
              <span>{formatDate(viewing.match_date)}</span>
            </div>
            {viewing.opponent && (
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <Users size={16} className="text-emerald-500" />
                <span>vs {viewing.opponent}</span>
              </div>
            )}
            {viewing.note && (
              <div className="p-4 bg-white rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 mb-1">メモ</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewing.note}</p>
              </div>
            )}
          </div>
          {viewing.user_id === user?.id && (
            <button onClick={() => { openEdit(viewing); setViewing(null); setShowForm(true); }} className="mt-6 w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl text-sm">
              編集する
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Video size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">試合動画</h2>
            <p className="text-[10px] text-slate-400 font-bold">試合の動画を記録</p>
          </div>
        </div>
        <button onClick={openAdd} className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-100 active:scale-95 transition-transform flex items-center space-x-2">
          <Plus size={20} />
          <span className="text-sm font-bold">追加</span>
        </button>
      </div>

      <section>
        <h3 className="font-black text-slate-800 tracking-tight text-lg mb-3">記録した試合動画</h3>
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-3 mb-2">
          <button
            onClick={() => setSelectedFolderId(FOLDER_ALL)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${selectedFolderId === FOLDER_ALL ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}
          >
            <Folder size={14} />
            すべて
          </button>
          <button
            onClick={() => setSelectedFolderId(FOLDER_UNSET)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${selectedFolderId === FOLDER_UNSET ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}
          >
            未分類
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFolderId(f.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${selectedFolderId === f.id ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}
            >
              <Folder size={14} />
              {f.name}
            </button>
          ))}
          <button
            onClick={() => { setShowNewFolder(true); setNewFolderName(''); }}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 border border-dashed border-slate-200 hover:border-emerald-300 hover:text-emerald-500 transition-colors"
            title="新しいフォルダ"
          >
            <FolderPlus size={14} />
            フォルダを追加
          </button>
        </div>
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-400">読み込み中...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Video size={32} className="text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-600 mb-1">まだ試合動画がありません</p>
            <p className="text-xs text-slate-400 mb-6">「追加」から携帯で撮った動画をアップロードしたり、フォルダでまとめて管理できます</p>
            <button onClick={openAdd} className="py-3 px-6 bg-emerald-500 text-white font-bold rounded-2xl text-sm active:scale-95 transition-transform">
              試合動画を追加
            </button>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center">
            <p className="text-sm text-slate-500">このフォルダには動画がありません</p>
            <p className="text-xs text-slate-400 mt-1">「追加」で動画を入れるか、別のフォルダを選んでください</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupVideosByYearMonth(filteredVideos).map(({ label, videos: groupVideos }) => (
              <div key={label}>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 px-1">{label}</h4>
                <div className="space-y-3">
                  {groupVideos.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setViewing(v)}
                      className="w-full bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm text-left active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-stretch">
                        <div className="relative w-28 h-28 shrink-0 rounded-l-3xl overflow-hidden bg-slate-900 flex items-center justify-center ring-1 ring-slate-100/50">
                          {v.video_url ? (
                            <>
                              <VideoThumbnail videoUrl={v.video_url} title={v.title} />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                  <Play size={18} className="text-slate-800 ml-0.5" fill="currentColor" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <Video size={28} className="text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                          <h4 className="text-sm font-black text-slate-800 truncate">{v.title}</h4>
                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">{formatDate(v.match_date)}</p>
                          {v.opponent && <p className="text-[10px] text-slate-400 mt-0.5">vs {v.opponent}</p>}
                        </div>
                        <div className="flex items-center pr-3 text-slate-300">
                          <ChevronLeft size={18} className="rotate-180" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-24 space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
            <h3 className="text-lg font-bold text-slate-800">{editingId ? '試合動画を編集' : '試合動画を追加'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">タイトル</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="例: 練習試合 vs 西部SC"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">試合日</label>
                <input
                  type="date"
                  value={form.match_date}
                  onChange={(e) => setForm((f) => ({ ...f, match_date: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">対戦相手（任意）</label>
                <input
                  value={form.opponent}
                  onChange={(e) => setForm((f) => ({ ...f, opponent: e.target.value }))}
                  placeholder="例: 西部SC"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">動画</label>
                <p className="text-[10px] text-slate-400 mb-2">そのままアップロードで即保存。容量を抑えたいときだけ「圧縮する」にチェック（初回は読み込みに時間がかかります）。</p>
                <label className="flex items-center justify-center gap-2 w-full px-4 py-4 bg-slate-50 border border-slate-100 border-dashed rounded-xl text-sm font-bold text-slate-600 cursor-pointer active:bg-slate-100">
                  <Upload size={18} />
                  <span>{selectedFile ? selectedFile.name : '動画ファイルを選択'}</span>
                  <input
                    type="file"
                    accept="video/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </label>
                {selectedFile && (
                  <label className="flex items-center gap-2 mt-2 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compressBeforeUpload}
                      onChange={(e) => setCompressBeforeUpload(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>圧縮してからアップロード（容量節約・時間かかります）</span>
                  </label>
                )}
                <p className="text-[10px] text-slate-400 mt-2">または YouTube のURL</p>
                <input
                  value={form.video_url}
                  onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
                  placeholder="https://youtube.com/..."
                  className="w-full px-4 py-3 mt-1 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={!!selectedFile}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">フォルダ</label>
                <div className="flex gap-2">
                  <select
                    value={form.folder_id ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, folder_id: e.target.value || null }))}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">未分類</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setShowNewFolder(true); setNewFolderName(''); }}
                    className="shrink-0 px-3 py-3 bg-slate-100 text-slate-500 rounded-xl text-sm font-bold border border-slate-100 hover:bg-slate-50 flex items-center gap-1"
                    title="新しいフォルダ"
                  >
                    <FolderPlus size={18} />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">メモ（任意）</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="メモ"
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>
            {(uploadStatus === 'loading' || uploadStatus === 'compressing' || uploadStatus === 'uploading') && (
              <div className="py-2 px-4 bg-emerald-50 rounded-xl text-sm text-emerald-700 font-bold">
                {uploadStatus === 'loading' && '圧縮の準備中...'}
                {uploadStatus === 'compressing' && `圧縮中 ${compressPercent}%`}
                {uploadStatus === 'uploading' && 'アップロード中...'}
              </div>
            )}
            <div className="flex space-x-3 pt-2">
              <button onClick={() => setShowForm(false)} disabled={saving} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl text-sm disabled:opacity-50">
                キャンセル
              </button>
              <button onClick={save} disabled={saving || !form.match_date} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-2xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && (uploadStatus === 'idle' || !selectedFile) ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {editingId ? '保存' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新しいフォルダ作成モーダル */}
      {showNewFolder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onClick={() => !creatingFolder && setShowNewFolder(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800">新しいフォルダ</h3>
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="フォルダ名（例: 練習試合・公式戦）"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
            />
            <div className="flex gap-2">
              <button onClick={() => !creatingFolder && setShowNewFolder(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm">キャンセル</button>
              <button onClick={createFolder} disabled={creatingFolder || !newFolderName.trim()} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                {creatingFolder ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
