import type { Metadata } from "next";
import { DrivePanel } from "@/components/drive-panel";
import { PageHeader, Group, Empty } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { intentChoices } from "@/lib/intents";
import { liveDb } from "@/lib/live";
import { canEdit } from "@/lib/rbac";
import { formatWhen } from "@/lib/format";

export const metadata: Metadata = { title: "Drive" };

export default async function DrivePage() {
  const user = await requireUser();
  const db = await liveDb();
  return (
    <div>
      <PageHeader
        title="Drive"
        lede="Paste a document and choose an intent. Brain routes it to that site and opens one pull request. Google Drive is not connected, so this does not read a Google account."
      />
      <div className="stack">
        <Group title="Connection">
          <div className="row">
            <span className="row-main">
              <span className="row-title">Google account</span>
              <span className="row-sub">Not connected</span>
            </span>
          </div>
          {db.drive.folders.map((folder) => (
            <div className="row" key={folder}>
              <span className="row-main">
                <span className="row-title">{folder}</span>
                <span className="row-sub">Local watch name</span>
              </span>
            </div>
          ))}
        </Group>
        <section>
          <h2 className="group-title">Bring in a document</h2>
          <DrivePanel folders={db.drive.folders} sites={db.sites} intents={intentChoices(db.sites)} canAdd={canEdit(user.role)} />
          <p className="group-footer">The intent chooses the paths. A second copy of the same document link is refused. The live site is not changed.</p>
        </section>
        <Group title="Documents">
          {db.drive.files.length ? (
            db.drive.files.map((file) => {
              const site = db.sites.find((item) => item.id === file.targetSiteId);
              const inner = (
                <>
                  <span className="row-main">
                    <span className="row-title">{file.name}</span>
                    <span className="row-sub">
                      {site?.name ?? "Website"} · {file.folder} · {formatWhen(file.addedAt)}
                    </span>
                  </span>
                  <span className="row-aside">{file.state}</span>
                </>
              );
              return file.articleId ? (
                <a className="row-link" key={file.id} href={`/pipeline/${file.articleId}`}>
                  {inner}
                </a>
              ) : (
                <div className="row" key={file.id}>
                  {inner}
                </div>
              );
            })
          ) : (
            <Empty title="No documents yet" body="Brought-in documents are listed here with the change they opened." />
          )}
        </Group>
      </div>
    </div>
  );
}
