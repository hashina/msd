(function () {
    "use strict";
    /*global app,angular, $scope*/
    /**
     * @description : construct local scope document object
     * @param vm
     * @param $scope
     * @param $state
     * @param $rootScope
     */
    function init(vm, $scope, $state, $rootScope) {
        vm.user.document = {};
        vm.user.document.cin = {};
        vm.user.document.pp = {};
        vm.user.document.jd = {};
        vm.user.document.rib = {};

        if ($rootScope.user.document && $rootScope.user.document.cin && $rootScope.user.document.cin.recto) {
            vm.user.document.cin.recto = {};
            vm.user.document.cin.recto.base64 = $rootScope.user.document.cin.recto.base64;
        }

        if ($rootScope.user.document && $rootScope.user.document.cin && $rootScope.user.document.cin.verso) {
            vm.user.document.cin.verso = {};
            vm.user.document.cin.verso = $rootScope.user.document.cin.verso;
        }
        if ($rootScope.user.document.jd.base64) {
            vm.user.document.jd = $rootScope.user.document.jd;
        }
        if ($rootScope.user.document.rib.base64) {
            vm.user.document.rib = $rootScope.user.document.rib;
        }
        if ($rootScope.user.document.pp.base64) {
            vm.user.document.pp = $rootScope.user.document.pp;
        }

        switch ($state.current.name) {
            case 'escrow.piece_identite':
                $scope.$parent.title = "Pièce d'identité";
                break;
            case 'escrow.justificatif_domicile':
                $scope.$parent.title = "Justificatif de domicile";
                break;
            case 'escrow.identite_bancaire':
                $scope.$parent.title = "Relevé d'identité bancaire";
                break;
            case 'escrow.kbis':
                $scope.$parent.title = "K-BIS";
                break;
            case 'escrow.statuts_societe':
                $scope.$parent.title = "Statuts de la société";
                break;
            case 'escrow.membres_capital':
                $scope.$parent.title = "Les membres du capital";
                break;
            case 'escrow.statassoc':
                $scope.$parent.title = "Statuts de l'association";
                break;
            case 'escrow.autor':
                $scope.$parent.title = "Autorisation";
                break;
            default:
                $scope.$parent.title = "Mes documents";
        }
    }

    app.controller('DocumentController', ['$scope', '$rootScope', '$mdDialog', '$mdToast', '$parse', 'DocumentService', '$mdMedia', '$state', '$timeout', '$ionicModal', 'base64ToBinService', 'cameraService', 'fileUploadService', 'DialogFactory', '$cordovaActionSheet', function ($scope, $rootScope, $mdDialog, $mdToast, $parse, DocumentService, $mdMedia, $state, $timeout, $ionicModal, base64ToBinService, cameraService, fileUploadService, DialogFactory, $cordovaActionSheet) {
        const tplUploadSuccessUrl = './templates/uploadPhotoSuccess.html';
        const tplUploadFailedUrl = './templates/toast.unexpected.file.html';
        const tplSubmitSuccessUrl = './templates/submitPhotoSuccess.html';
        var vm = this;
        vm.user = {id: $rootScope.user.id};
        $scope.maj = new Date();
        vm.status = ' ';
        vm.identityType = ["Carte d'identité recto-verso", "Passeport"];
        vm.pieceType = ["Facture d'énergie", "Internet", "Télécom", "Quittance de loyer", "Avis d'imposition",
            "Taxe foncière", "Taxe d'habitation"];
        vm.fileType = 'recto';
        vm.hideImg = false;
        vm.hideRecto = false;
        vm.hideVerso = false;
        init(vm, $scope, $state, $rootScope);
        /*  vm.identitySelected = */
        /**
         *@description modal to view pdf
         */
        $ionicModal.fromTemplateUrl('templates/pdf-viewer.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function (modal) {
            $scope.modal = modal;
        });
        $scope.$on('$destroy', function () {
            $scope.modal.remove();
        });
        function ZoomerController($scope, $mdDialog, item, titre) {
            $scope.item = item;
            switch (titre) {
                case 'pp':
                    $scope.libelle = 'Passerport';
                    break;
                case 'jd':
                    $scope.libelle = 'Justificatif de domicile';
                    break;
                case 'rib':
                    $scope.libelle = 'Relevé d\'identité bancaire';
                    break;
                case 'recto':
                    $scope.libelle = 'Pièce d\'identité recto';
                    break;
                case 'verso':
                    $scope.libelle = 'Pièce d\'identité verso';
                    break;
            }
            $scope.hide = function () {
                $mdDialog.hide();
            };

            $scope.cancel = function () {
                $mdDialog.cancel();
            };

            $scope.answer = function (answer) {
                $mdDialog.hide(answer);
            };
        }

        /**
         * @description modal to zoom picture
         * @param ev
         * @param titre
         * @param leScope
         */
        /*DEBUT ZOOMER*/
        $scope.zoomer = function (ev, titre, leScope) {
            $mdDialog.show({
                controller: ZoomerController,
                templateUrl: './templates/zoomer.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                fullscreen: false, // Only for -xs, -sm breakpoints.
                locals: {
                    item: leScope,
                    titre: titre
                }
            }).then(function (answer) {
                $scope.response = 'You said the information was "' + answer + '".';
            }, function () {
                $scope.response = 'You cancelled the dialog.';
            });
        };
        /*FIN ZOOMER*/
        /**
         *@description create pdf blob from pdf base64 (to rename)
         * @param type
         * @returns {boolean}
         */
        /*START BLOB*/
        vm.createBin = function (type) {
            if (!type) {
                return false;
            }
            var myPdfBase64;
            switch (type) {
                case 'cin_recto':
                    vm.filename = 'cin_recto_' + vm.user.id + '.pdf';
                    myPdfBase64 = vm.user.document.cin.recto.base64.replace("data:application/pdf;base64,", '');
                    break;
                case 'cin_verso':
                    vm.filename = 'cin_verso_' + vm.user.id + '.pdf';
                    myPdfBase64 = vm.user.cin.verso.base64.replace("data:application/pdf;base64,", '');
                    break;
                case 'pp':
                    vm.filename = 'pp_' + vm.user.id + '.pdf';
                    myPdfBase64 = vm.user.document.pp.base64.replace("data:application/pdf;base64,", '');
                    break;
                case 'rib':
                    vm.filename = 'rib_' + vm.user.id + '.pdf';
                    myPdfBase64 = vm.user.document.rib.base64.replace("data:application/pdf;base64,", '');
                    break;
                case 'jd':
                    vm.filename = 'jd_' + vm.user.id + '.pdf';
                    myPdfBase64 = vm.user.document.jd.base64.replace("data:application/pdf;base64,", '');
                    break;
            }
            callBaseToBinService(myPdfBase64);
            return false;
        };

        $scope.suppDialog = function (event, docType) {
            var title;
            switch ($state.current.url) {
                case "/piece_identite":
                    title = "Pièce d'identité";
                    break;
                case "/justificatif_domiile":
                    title = "Justificatif de domicile"
                    break;
                case "/identite_bancaire":
                    title = "Rélevé d'identité bancaire"
            }
            var confirm = $mdDialog.confirm()
                .title(title)
                .textContent('Voulez-vous vraiment supprimer ce document?')
                .ariaLabel('Lucky day')
                .targetEvent(event)
                .ok('Valider')
                .cancel('Annuler');

            $mdDialog.show(confirm).then(function () {
                /**
                 * @description HACK : recto ou verso à null permet d'organiser l'ordre de l'upload du CIN
                 * si recto null, le fichier prochainement uploadé sera recto
                 * si recto not null et verso null, le prochain CIN uploadé sera verso
                 * si recto null et verso null, on suit la cours normale çad le 1er recto et le suivant verso
                 */
                if (docType === 'recto') {
                    /**
                     * Cache le recto de la cin, la valeur null ne met pas à jour ng-src
                     */
                    vm.hideRecto = true;
                    vm.user.document.cin.recto.base64 = undefined;
                    return;
                }
                if (docType === 'verso') {
                    /**
                     * Cache le verso de la cin, la valeur null ne met pas à jour ng-src
                     */
                    vm.hideVerso = true;
                    vm.user.document.cin.verso.base64 = undefined;
                    return;
                }
                /**
                 * @description permet de cacher les images/pdf autres que le cin recto/verso
                 * c'est nécessaire vu que ng-src ne se met pas à jour
                 */
                vm.hideImg = true;
            }, function () {
            });
            //DialogFactory.confirm(event, 'DocumentController');
        };

        function callBaseToBinService(myPdfBase64) {
            var pdf = new base64ToBinService.Pdf(myPdfBase64);
            pdf.b64toPdf(function (response) {
                $scope.pdfUrl = response;
                $scope.modal.show();
            });
        }

        /*END Blob*/


        vm.changeIdentityTypeTo = function (identity) {
            vm.selectedIdentity = identity;
            $rootScope.selectedIdentity = identity;
        };
        vm.changePieceTypeTo = function (piece) {
            vm.selectedPiece = piece;
        };
        $scope.showTabDialog = function (ev) {
            $mdDialog.show({
                controller: GestionDocumentCtrl,
                templateUrl: './templates/modalDocument.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true
            }).then(function (answer) {
                $scope.status = 'You said the information was "' + answer + '".';
            }, function () {
                $scope.status = 'You cancelled the dialog.';
            });
        };

        function GestionDocumentCtrl($scope, $mdDialog) {

            $scope.hide = function () {
                $mdDialog.hide();
            };

            $scope.cancel = function () {
                $mdDialog.cancel();
            };

            $scope.answer = function (answer) {
                $mdDialog.hide(answer);
            };

        }

        /**
         *choose() : uploadFile module native function
         *call fileUploadService uploadFile API
         *return uploaded file base64 if success or error reason inside promise
         **/
        /*UPLOAD START*/
        $scope.choose = function (data, ev) {
            /* if (data.documentType === 'cin') {
             if (vm.user.document.cin.recto.base64 && vm.user.document.cin.verso.base64) {
             return $rootScope.showSimpleToast("Veuillez supprimer le document que vous voulez remplacer et réessayer à nouveau.");
             } else {
             if (vm.user.document.cin.recto.base64 === undefined) {
             data.documentType = 'recto';
             } else {
             data.documentType = 'verso';
             }
             }
             }*/
            if (data.documentType === 'cin') {
                data.documentType = 'recto';
            }
            fileUploadService.uploadFile(data).then(function (data) {
                setScopes(data, function (error, response) {
                    if (error) {
                        $rootScope.showSimpleToast("Un erreur est survenue.");
                        return;
                    }
                    vm.hideRecto = false;
                    vm.hideVerso = false;
                    vm.hideImg = false;
                    DialogFactory.uploadStatus(ev, tplUploadSuccessUrl);
                });
            }).catch(function (err) {
                console.error(err);
                if (err === 'unexpected file') {
                    DialogFactory.uploadStatus(ev, tplUploadFailedUrl);
                }
            });
        };
        /*UPLOAD END*/
        /**
         *@description take photo handler
         * @param type
         * @param ev
         */
        $scope.takePhoto = function (type, ev) {
            /* if (type === 'cin') {
             if (vm.user.document.cin.recto.base64 && vm.user.document.cin.verso.base64) {
             return $rootScope.showSimpleToast("Veuillez supprimer le document que vous voulez remplacer et réessayer à nouveau");
             } else {
             if (vm.user.document.cin.recto.base64 === undefined) {
             type = 'recto';
             } else {
             type = 'verso';
             }
             }
             }*/
            if (type === 'cin') {
                type = 'recto';
            }
            cameraService.takePicture(function (FILE_URI) {
                var HEADER = "data:image/jpeg;base64,",
                    data = {
                        'base64': HEADER + FILE_URI,
                        'documentType': type,
                        'nativeUri': null
                    };
                setScopes(data, function (error, response) {
                    if (error) {
                        $rootScope.showSimpleToast("Un erreur est survenue.");
                        return;
                    }
                    vm.hideRecto = false;
                    vm.hideVerso = false;
                    vm.hideImg = false;
                    DialogFactory.uploadStatus(ev, tplUploadSuccessUrl);
                });
            });
        };
        /**
         * @description common function to assign scope
         * @param data
         * @param callback
         */
        function setScopes(data, callback) {
            if (data.base64 == null) {
                callback("error", null);
                return;
            }
            var fileType;
            switch (data.documentType) {
                case 'recto':
                    fileType = getFileType(data);
                    vm.user.document.cin.recto = {'base64': data.base64, 'url': data.nativeUri, 'type': fileType};
                    break;
                case 'verso':
                    fileType = getFileType(data);
                    vm.user.document.cin.verso = {'base64': data.base64, 'url': data.nativeUri, 'type': fileType};
                    break;
                case 'pp':
                    fileType = getFileType(data);
                    vm.user.document.pp = {'base64': data.base64, 'url': data.nativeUri, 'type': fileType};
                    break;
                case 'jd':
                    fileType = getFileType(data);
                    vm.user.document.jd = {'base64': data.base64, 'url': data.nativeUri, 'type': fileType};
                    break;
                case 'rib':
                    fileType = getFileType(data);
                    vm.user.document.rib = {'base64': data.base64, 'url': data.nativeUri, 'type': fileType};
                    break;
            }
            callback(null, "success");
        }

        function getFileType(data) {
            return (data.isPdf) ? 'pdf' : 'other';
        }

        // envoye document
        vm.sendDocs = function (ev, type) {
            $scope.loading = true;
            $rootScope.user.etape = 4;
            DocumentService.sendDocument(vm, type);
        };
        $scope.$on('event:send-document-success', function (e, data) {
            $scope.loading = false;
            if (data == true) {
                $rootScope.showSimpleToast("Veuillez contacter l\'administrateur pour supprimer votre ancien document.");
            } else {
                DialogFactory.uploadStatus(ev, tplSubmitSuccessUrl);
            }
        });
        $scope.$on('event:send-document-failed', function () {
            $scope.loading = false;
            $rootScope.showSimpleToast("L' enregistrement n'a pas abouti");
        });
        $scope.$on('event:no-document', function () {
            $scope.loading = false;
            $rootScope.showSimpleToast("Veuillez choisir un fichier.");
        });
        return vm;
    }]);
}());
