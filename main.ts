import { match } from 'assert'
import { CachedMetadata, Command, Editor, FrontMatterCache, Modal, Plugin, ViewState, App, Setting, TFile, Vault, parseYaml, stringifyYaml } from 'obsidian'
import { parse, stringify } from 'yaml'

export default class PropertyHandlerPlugin extends Plugin {
	registerCommands() {
		this.addCommand({
			id: 'test-command',
			name: 'test command',
			callback: () => {
				const noteFile = this.app.workspace.getActiveFile();

				if (noteFile) {
					const cachedMetadata = this.app.metadataCache.getFileCache(noteFile);
				}
			}
		})

		this.addCommand({
			id: 'rename-property-key',
			name: 'Rename property key',
			callback: () => {
				new RenamePropertyKeyModal(this.app, (exsitingPropertyKey: string, newPropertyKey: string) => {
					const vaultMarkdownFiles = this.app.vault.getMarkdownFiles();
					
					vaultMarkdownFiles.forEach(markdownFile => {
						renamePropertyKey(this.app, this.app.vault, markdownFile, exsitingPropertyKey, newPropertyKey);
					});

				}).open();
			}
		});
	}

	async onload() {
		this.registerCommands();

		console.log('plugin loaded');
	}

	async onunload() {
		

		console.log('plugin unloaded');
	}
}

function renamePropertyKey(app: App, vault: Vault, file: TFile, existingPropertyKey: string, newPropertyKey: string): Promise<string> {
	return vault.process(file, (data) => {
		const frontMatterYAMLPattern = /^---\s*([\s\S]*?)\s*---/;
		let frontMatterYAML  = data.match(frontMatterYAMLPattern);

		if (frontMatterYAML && frontMatterYAML[1]) {
			let parsedFrontMatterYAML = parseYaml(frontMatterYAML[1])

			if (existingPropertyKey !== newPropertyKey && newPropertyKey) {
				const existingPropertyDescriptor = Object.getOwnPropertyDescriptor(parsedFrontMatterYAML, existingPropertyKey);

				if (existingPropertyDescriptor) {
					Object.defineProperty(parsedFrontMatterYAML, newPropertyKey, existingPropertyDescriptor);

					delete parsedFrontMatterYAML[existingPropertyKey];

					//! @todo this looks pretty ugly so I'll need to figure somthing better out
					return '---\n' + data.replace(frontMatterYAMLPattern, stringifyYaml(parsedFrontMatterYAML) + '\n---');
				}
			}
		}

		return data;
	})
}

/**
 * @brief This modal is used to get a property to be renamed and a new property key to which it will be renamed to.
 */
export class RenamePropertyKeyModal extends Modal {
	existingPropertyKey: string;
	newPropertyKey: string;
	onSubmit: (existingPropertyKey: string, newPropertyKey: string) => void;
	
	constructor(app: App, onSubmit: (existingPropertyKey: string, newPropertyKey: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onClose(): void {
		const { contentEl } = this;
		
		contentEl.empty();
	}

	onOpen(): void {
		const { contentEl } = this;
		
		contentEl.createEl('h1', { text: 'Bulk rename property' });

		new Setting(contentEl)
			.setName('Existing property key')
			.addText((text) => {
				text.onChange((value) => {
					this.existingPropertyKey = value;
				});
			});

		new Setting(contentEl)
			.setName('New property key')
			.addText((text) => {
				text.onChange((value) => {
					this.newPropertyKey = value;
				});
			});

		new Setting(contentEl)
			.addButton((button) => {
				button
					.setButtonText('Rename')
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.existingPropertyKey, this.newPropertyKey);
					});
			});
	}
}