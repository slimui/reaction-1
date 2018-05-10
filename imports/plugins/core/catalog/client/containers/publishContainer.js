import React, { Component } from "react";
import PropTypes from "prop-types";
import { composeWithTracker } from "@reactioncommerce/reaction-components";
import PublishControls from "../components/publishControls";
import { Revisions } from "/lib/collections";
import { Meteor } from "meteor/meteor";
import TranslationProvider from "/imports/plugins/core/ui/client/providers/translationProvider";
import { Reaction, i18next } from "/client/api";

/*
 * PublishContainer is a container component connected to Meteor data source.
 */
class PublishContainer extends Component {
  publishToCatalog(collection, documentIds) {
    Meteor.call(`catalog/publish/${collection}`, documentIds, (error, result) => {
      if (result) {
        Alerts.toast(i18next.t("admin.catalogProductPublishSuccess", { defaultValue: "Product published to catalog" }), "success");
      } else if (error) {
        Alerts.toast(error.message, "error");
      }
    });
  }

  handlePublishClick = () => {
    const productIds = this.props.documents
      .filter((doc) => doc.type === "simple")
      .map((doc) => doc._id);

    this.publishToCatalog("products", productIds);
  }

  handlePublishActions = (event, action, documentIds) => {
    switch (action) {
      case "archive":
        if (this.props.onAction) {
          this.props.onAction(event, action, this.props.documentIds);
        }
        break;
      case "discard":
        Meteor.call("revisions/discard", documentIds, (error, result) => {
          if (result === true) {
            const message = i18next.t("revisions.changesDiscarded", {
              defaultValue: "Changes discarded successfully"
            });

            Alerts.toast(message, "success");
          } else {
            const message = i18next.t("revisions.noChangesDiscarded", {
              defaultValue: "There are no changes to discard"
            });

            Alerts.toast(message, "warning");
          }
        });
        break;
      default:
    }
  }

  render() {
    return (
      <TranslationProvider>
        <PublishControls
          documentIds={this.props.documentIds}
          documents={this.props.documents}
          isEnabled={this.props.isEnabled}
          onPublishClick={this.handlePublishClick}
          onAction={this.handlePublishActions}
          onVisibilityChange={this.props.onVisibilityChange}
          revisions={this.props.revisions}
          isPreview={this.props.isPreview}
        />
      </TranslationProvider>
    );
  }
}

PublishContainer.propTypes = {
  documentIds: PropTypes.arrayOf(PropTypes.string),
  documents: PropTypes.arrayOf(PropTypes.object),
  isEnabled: PropTypes.bool,
  isPreview: PropTypes.bool,
  onAction: PropTypes.func,
  onPublishSuccess: PropTypes.func,
  onVisibilityChange: PropTypes.func,
  product: PropTypes.object,
  revisions: PropTypes.arrayOf(PropTypes.object)
};

function composer(props, onData) {
  const viewAs = Reaction.getUserPreferences("reaction-dashboard", "viewAs", "administrator");

  if (Array.isArray(props.documentIds) && props.documentIds.length) {
    const subscription = Meteor.subscribe("ProductRevisions", props.documentIds);

    if (subscription.ready()) {
      const revisions = Revisions.find({
        "$or": [
          {
            documentId: {
              $in: props.documentIds
            }
          },
          {
            "documentData.ancestors": {
              $in: props.documentIds
            }
          },
          {
            parentDocument: {
              $in: props.documentIds
            }
          }
        ],
        "workflow.status": {
          $nin: [
            "revision/published"
          ]
        }
      }).fetch();

      onData(null, {
        documentIds: props.documentIds,
        documents: props.documents,
        revisions,
        isPreview: viewAs === "customer"
      });

      return;
    }
  }

  onData(null, {
    isPreview: viewAs === "customer"
  });
}

export default composeWithTracker(composer)(PublishContainer);