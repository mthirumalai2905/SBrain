import type { Metadata } from "next";
import { DrivePanel } from "@/components/drive-panel";
import { PageHeader, Group, Empty } from "@/components/ui";
import { requireUser } from "@/lib/auth";
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
        lede="Google Drive is not connected. There is no OAuth client in this environment, so Brain cannot read Docs or watch a Google folder."
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
          <DrivePanel folders={db.drive.folders} sites={db.sites} canAdd={canEdit(user.role)} />
          <p className="group-footer">Paste text from a Doc until Drive can be connected. Brain formats it for the chosen website and blocks a second copy of the same title.</p>
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
            <Empty title="No documents yet" body="Brought-in documents are listed here with the article they became." />
          )}
        </Group>
      </div>
    </div>
  );
}
