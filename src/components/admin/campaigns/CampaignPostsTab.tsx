'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronRight, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import type { CampaignPhase } from '@/lib/campaign/phase';
import type { PostView, PostsDetail } from '@/lib/campaign/post-api';
import { POST_KIND_CONFIG, type EditablePostKind } from '@/lib/campaign/posts';
import CampaignPostEditor from './CampaignPostEditor';
import { campaignApi } from './labels';
import { autoPublishLabel, formatPublished, postImageUrl } from './post-ui';

// "Postlar" tabi (A4): kanal postlari va ulashiladigan post. Avtomatik so'rov
// (polling) yo'q — capture'dan keyin admin «Yangilash» ni o'zi bosadi.

function StatusBadges({ post }: { post: PostView }) {
  const auto = autoPublishLabel(post);
  return (
    <span className="flex flex-wrap items-center gap-2">
      {post.channelMessageId && post.publishedAt ? (
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">Kanalda · {formatPublished(post.publishedAt)}</span>
      ) : (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${post.isDefault ? 'bg-gray-100 text-gray-600' : 'bg-primary-50 text-primary-700'}`}>
          {post.isDefault ? 'Standart' : "O'zgartirilgan"}
        </span>
      )}
      {auto && (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${post.isDefault ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>{auto}</span>
      )}
    </span>
  );
}

type Props = { campaignId: string; phase: CampaignPhase };

export default function CampaignPostsTab({ campaignId, phase }: Props) {
  const [data, setData] = useState<PostsDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<EditablePostKind | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await campaignApi<PostsDetail>(`/api/admin/campaigns/${campaignId}/posts`);
    setLoading(false);
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else setError(res.error);
  }, [campaignId]);

  useEffect(() => { void load(); }, [load]);

  if (!data) {
    return error
      ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      : <div className="flex justify-center py-12" role="status"><Loader2 size={28} className="animate-spin text-primary-600" /></div>;
  }

  const refreshButton = (
    <button type="button" onClick={() => void load()} disabled={loading}
      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium hover:bg-primary-50 disabled:opacity-50">
      <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden /> Yangilash
    </button>
  );

  const post = selected ? data.posts.find((p) => p.kind === selected) : undefined;
  if (post) {
    return (
      <CampaignPostEditor
        key={post.kind}
        campaignId={campaignId}
        phase={data.phase}
        post={post}
        sampleVars={data.sampleVars}
        refreshButton={refreshButton}
        onChanged={load}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      {phase === 'DRAFT' && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          Kanalga chiqarish aksiya e&apos;lon qilingandan keyin. Hozir «O&apos;zimga sinov» bilan tekshiring.
        </p>
      )}
      <div className="flex justify-end">{refreshButton}</div>
      <ul className="card divide-y divide-gray-100">
        {data.posts.map((p) => (
          <li key={p.kind} className="flex items-center gap-3 px-4 py-3">
            <button type="button" onClick={() => setSelected(p.kind)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left">
              {p.hasImage && (
                // eslint-disable-next-line @next/next/no-img-element -- admin proxy rasmi
                <img src={postImageUrl(campaignId, p.kind, p.updatedAt)} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text-primary">{POST_KIND_CONFIG[p.kind].name}</span>
                  <StatusBadges post={p} />
                </span>
                <span className="mt-0.5 block text-xs text-text-secondary">{POST_KIND_CONFIG[p.kind].where}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-text-secondary" aria-hidden />
            </button>
            {p.channelUrl && (
              <a href={p.channelUrl} target="_blank" rel="noopener noreferrer" aria-label="Kanalda ochish" title="Kanalda ochish"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-primary-700 hover:bg-primary-50">
                <ExternalLink size={18} aria-hidden />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
