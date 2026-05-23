import { type FormEvent, useCallback, useEffect, useState } from 'react';
import {
  fetchAiConfig,
  updateAiConfigApi,
} from '../../features/ai/api/ai.api';
import {
  MODERATION_CATEGORIES,
  MODERATION_CATEGORY_LABELS,
  mergeCategoryThresholds,
  type CategoryThresholds,
} from '../../features/ai/constants/moderationCategories';
import type { AiModerationConfig } from '../../features/users/types/users.types';
import { Button } from '../../shared/components/Button';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';

export function AiSettingsPage() {
  const [config, setConfig] = useState<AiModerationConfig | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [temperature, setTemperature] = useState(0.5);
  const [categoryThresholds, setCategoryThresholds] =
    useState<CategoryThresholds>(() => mergeCategoryThresholds(undefined, 0.5));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAiConfig();
      setConfig(data);
      setEnabled(data.enabled);
      setTemperature(data.temperature);
      setCategoryThresholds(
        mergeCategoryThresholds(
          data.categoryThresholds as Partial<CategoryThresholds>,
          data.temperature,
        ),
      );
    } catch {
      setError('Could not load AI settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const applyDefaultToAll = () => {
    setCategoryThresholds(mergeCategoryThresholds(undefined, temperature));
  };

  const setCategoryThreshold = (cat: (typeof MODERATION_CATEGORIES)[number], value: number) => {
    setCategoryThresholds((prev) => ({ ...prev, [cat]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateAiConfigApi({
        enabled,
        temperature,
        categoryThresholds,
      });
      setConfig(updated);
      setCategoryThresholds(
        mergeCategoryThresholds(
          updated.categoryThresholds as Partial<CategoryThresholds>,
          updated.temperature,
        ),
      );
      setSaved(true);
    } catch {
      setError('Failed to save AI settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <LoadingState label="Loading AI settings…" />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Automation"
        title="AI moderation"
        description="Tune score thresholds per OpenAI moderation attribute. Lower value = stricter. Content flagged by OpenAI is always held."
      />

      {error ? <div className="alert alert--error">{error}</div> : null}
      {saved ? (
        <div className="alert alert--success">Settings saved.</div>
      ) : null}

      <form className="settings-form settings-form--wide" onSubmit={handleSubmit}>
        <label className="settings-form__toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>Enable AI moderation</span>
        </label>

        <div className="field">
          <label className="field__label" htmlFor="default-temperature">
            Default threshold ({temperature.toFixed(2)})
          </label>
          <input
            id="default-temperature"
            className="field__input field__input--range"
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            disabled={!enabled}
          />
          <p className="field__hint">
            Used as the fallback for categories without a custom value.
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={!enabled}
            onClick={applyDefaultToAll}
          >
            Apply default to all categories
          </Button>
        </div>

        <section className="category-thresholds">
          <h2 className="category-thresholds__title">Per-category thresholds</h2>
          <p className="field__hint">
            Matches OpenAI category_scores keys. Post is held when any score ≥
            its threshold.
          </p>
          <div className="category-thresholds__grid">
            {MODERATION_CATEGORIES.map((cat) => (
              <div key={cat} className="category-thresholds__item">
                <label className="field__label" htmlFor={`cat-${cat}`}>
                  {MODERATION_CATEGORY_LABELS[cat]}
                  <span className="category-thresholds__key">{cat}</span>
                </label>
                <input
                  id={`cat-${cat}`}
                  className="field__input field__input--range"
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={categoryThresholds[cat]}
                  onChange={(e) =>
                    setCategoryThreshold(cat, Number(e.target.value))
                  }
                  disabled={!enabled}
                />
                <span className="category-thresholds__value">
                  {categoryThresholds[cat].toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {config ? (
          <p className="field__hint">
            Last updated {new Date(config.updatedAt).toLocaleString()}
          </p>
        ) : null}

        <Button type="submit" loading={saving}>
          Save settings
        </Button>
      </form>
    </div>
  );
}
