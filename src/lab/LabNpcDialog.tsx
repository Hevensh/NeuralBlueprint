import { useState } from 'react';
import { useLanguage } from '../i18n/useLanguage';
import { getTopicEncounterId } from './labProgress';
import type { LabNpcDefinition, LabNpcTopic, LabProgress } from './labTypes';

interface LabNpcDialogProps {
  npc: LabNpcDefinition;
  progress: LabProgress;
  day: number;
  onCompleteTopic: (npcId: string, topic: LabNpcTopic) => void;
  onClose: () => void;
}

export function LabNpcDialog({
  npc,
  progress,
  day,
  onCompleteTopic,
  onClose,
}: LabNpcDialogProps) {
  const { labels, language } = useLanguage();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const selectedTopic = npc.topics.find((topic) => topic.id === selectedTopicId);
  const encounterId = selectedTopic
    ? getTopicEncounterId(day, npc.id, selectedTopic.id)
    : null;
  const rewardReceipt = progress.rewards.find(
    (receipt) => receipt.encounterId === encounterId,
  );
  const rewardLabel = selectedTopic?.rewards?.find(
    (candidate) => candidate.reward.id === rewardReceipt?.reward.id,
  )?.label[language];

  const selectTopic = (topic: LabNpcTopic) => {
    setSelectedTopicId(topic.id);
    onCompleteTopic(npc.id, topic);
  };

  return (
    <div className="lab-dialog-backdrop" onMouseDown={onClose}>
      <section
        aria-label={npc.name[language]}
        className="lab-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="lab-dialog-header">
          <div
            className="lab-dialog-avatar"
            style={{ '--npc-color': npc.color } as React.CSSProperties}
          >
            {npc.name[language].slice(0, 1)}
          </div>
          <div>
            <div className="lab-dialog-name">{npc.name[language]}</div>
            <div className="lab-dialog-role">
              {npc.role === 'senior' ? labels.lab.senior : labels.lab.peer}
            </div>
          </div>
        </header>

        <div className="lab-dialog-body">
          <div className="lab-dialog-topics">
            {npc.topics.map((topic) => {
              const topicEncounterId = getTopicEncounterId(
                day,
                npc.id,
                topic.id,
              );
              const completed = progress.completedTopicIds.includes(topicEncounterId);
              return (
                <button
                  className={`lab-dialog-topic ${selectedTopicId === topic.id ? 'active' : ''}`}
                  key={topic.id}
                  onClick={() => selectTopic(topic)}
                  type="button"
                >
                  <span>{topic.question[language]}</span>
                  {completed && <span className="lab-dialog-topic-mark">✓</span>}
                </button>
              );
            })}
          </div>

          <div className="lab-dialog-response">
            {selectedTopic ? (
              <>
                <p>{selectedTopic.response[language]}</p>
                {rewardLabel && (
                  <div className="lab-dialog-reward">
                    {labels.lab.reward}: {rewardLabel}
                  </div>
                )}
              </>
            ) : (
              <p>{npc.topics[0]?.question[language]}</p>
            )}
          </div>
        </div>

        <button className="action-button" onClick={onClose} type="button">
          {labels.lab.close}
        </button>
      </section>
    </div>
  );
}
